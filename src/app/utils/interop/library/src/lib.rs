extern crate libc;
extern crate nom;
extern crate nom_unicode;
use libc::c_char;
use std::ffi::CStr;
use std::process::Command;

pub mod string_macros {
    /// converts C string pointer passed from JS to a Rust-acceptable String
    #[macro_export]
    macro_rules! j_to_r_str {
        ($c_str:ident) => {{
            let c_str: *const c_char = $c_str;
            { unsafe { CStr::from_ptr(c_str) } }
                .to_str()
                .unwrap()
                .to_string()
        }};
    }
    /// converts a String to a C-like string that can be read by JS
    #[macro_export]
    macro_rules! r_to_j_str {
        ($r_str:expr) => {{
            let r_str: String = $r_str;
            format!("{}\0", r_str).as_ptr()
        }}
    }
}

/// Test function, echoes back recieved string.
#[no_mangle]
pub extern "C" fn echo(call: *const c_char) -> *const u8 {
    let text = String::from("Received:") + &j_to_r_str!(call);
    let response = r_to_j_str!(text);
    response
}

/// Wrapper for generate_svg that can be called from JS side. 
/// Handles reading and converting string types, and replies with the output message from
/// the Graphemy CLI.
#[no_mangle]
pub extern "C" fn graphemify(file: *const c_char, text: *const c_char) -> *const u8 {
    let (file_str, text_str) = (
        j_to_r_str!(file),
        j_to_r_str!(text)
    );
    let output = generate_svg(file_str, text_str, true);
    r_to_j_str!(output)
}

/// Runs the graphemy CLI typeset command to generate an SVG file, given file name and input text
pub fn generate_svg(file: String, text: String, called_from_afar: bool) -> String {
    // When this is called from the JS side, the working directory is the top of the application.
    // To get to this folder, need to prepend ./src/app/utils/interop/library/src/
    let bin_location = match called_from_afar {
        true  => "./src/app/utils/interop/library/src/graphemy",
        false => "./src/graphemy"
    };

    let output = Command::new(bin_location)
        .args(["typeset", "--lang", &file, "from-arg", &text])
        .output()
        .expect("failed to execute graphemy typeset command");

    format!(
        "Output: {}\nError: {}",
        match String::from_utf8(output.stdout) {
            Ok(s) => s,
            Err(e) => format!("{:#}", e),
        },
        match String::from_utf8(output.stderr) {
            Ok(s) => s,
            Err(e) => format!("{:#}", e),
        }
    )
}

pub mod parser {
    use nom::{
        branch::alt,
        bytes::complete::{tag, take_until},
        character::complete::{alphanumeric0, alphanumeric1},
        combinator::{eof, map, recognize, rest},
        sequence::tuple,
        IResult,
    };
    use nom_unicode::complete::space0;
    use std::vec;

    fn category_parse(i: &str) -> IResult<&str, Vec<&str>> {
        map(
            tuple((
                space0,
                alphanumeric1,
                space0,
                tag("::"),
                space0,
                alt((take_until("\n"), take_until(";"), eof)),
                alt((tag("\n"), tag(";"), eof)),
                rest,
            )),
            |(_, name, _, _, _, items, _, remainder)| vec!["_category", name, items, remainder],
        )(i)
    }

    fn context_parser(i: &str) -> IResult<&str, &str> {
        map(
            tuple((
                tag("/"),
                space0,
                recognize(tuple((alphanumeric0, tag("_"), alphanumeric0))),
                space0,
                alt((tag("\n"), tag(";"), eof)),
            )),
            |(_, _, context, _, _)| context,
        )(i)
    }

    fn rule_parse(i: &str) -> IResult<&str, Vec<&str>> {
        map(
            tuple((
                space0,
                alphanumeric1,
                space0,
                alt((tag(">"), tag("/"))),
                space0,
                alphanumeric0,
                space0,
                alt((context_parser, tag("\n"), tag(";"), eof)),
                rest,
            )),
            |(_, pattern, _, _, _, sub, _, context, remainder)| {
                vec!["_rule", pattern, sub, context, remainder]
            },
        )(i)
    }

    fn parse(i: &str) -> (String, Vec<&str>, String) {
        match alt((category_parse, rule_parse))(i) {
            Ok(val) => {
                let (_, c) = val;
                match c[0] {
                    "_category" => (
                        /* name      */ ["Name: ", c[1], " - Items:"].join(""),
                        /* items     */ c[2].split_whitespace().collect::<Vec<&str>>(),
                        /* remainder */ c[3].to_string(),
                    ),
                    "_rule" => (
                        /* pattern      */ ["Pattern: ", c[1]].join(""),
                        /* sub, context */ vec!["- Substitute:", c[2], "- Context:", c[3]],
                        /* remainder    */ c[4].to_string(),
                    ),
                    _ => (String::from("Unlabled line format."), vec![], String::new()),
                }
            }
            Err(e) => (format!("{:?}", e), vec![], String::new()),
        }
    }

    pub fn process(input: &String) -> String {
        let mut combined = String::new();
        let (name, items, remainder) = parse(&input);
        combined = format!("{}\n {}", combined, {
            format!("{} {}", name, items.join(" "))
        });
        if remainder != String::from("") {
            combined += &process(&remainder);
        }
        combined
    }
}
