fn main() -> () {
    println!(
        "Hello from Rust. Use `cargo test <test name> --nocapture` to run this module's tests."
    )
}

#[cfg(test)]
mod tests {
    #[test]
    fn process() {
        let input = String::from(
            "Cons :: m n b t d f g k r th sh
        Vows :: a e ae io u ou y è \na > e / _; i > ei;\no > u / w_",
        );
        let result = library::parser::process(&input);
        println!("Input:\n{}\n\nResult:{}", input, result);
    }
    // #[test]
    // fn graphemify() {
    //     let s = library::generate_svg(String::from("./src/Veiśu"), String::from("veiśu"), false);
    //     println!("{}", s);
    // }
}
