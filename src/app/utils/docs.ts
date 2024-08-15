import { docsEditor } from '../stores';
import EditorJS, { type EditorConfig, type OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import Table from '@editorjs/table';
import Underline from '@editorjs/underline';
/* eslint-disable @typescript-eslint/no-explicit-any */
enum LogLevels { // REVIEW - monkeypatch gets around type check error, can't import this from @editorjs/editorjs/types for ...reasons.
    VERBOSE = 'VERBOSE',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}
export class Monospace { // EditorJS custom class
    api: any;
    button: null | HTMLButtonElement;
    tag: string;
    iconClasses: any;

    static get CSS() {
        return 'cdx-monospace';
    }

    constructor({ api }: { api: any }) {
        this.api = api;
        this.button = null;
        this.tag = 'CODE';
        this.iconClasses = {
            base: this.api.styles.inlineToolButton,
            active: this.api.styles.inlineToolButtonActive,
        };
    }
    static get isInline() {
        return true;
    }
    render() {
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.textContent = 'M';
        this.button.classList.add(this.api.styles.inlineToolButton);
        return this.button;
    }
    surround(range: Range) {
        if (!range) {
            return;
        }
        const termWrapper = this.api.selection.findParentTag(this.tag, Monospace.CSS);
    
        // If start or end of selection is in the highlighted block
        if (termWrapper) {
            this.unwrap(termWrapper);
        } else {
            this.wrap(range);
        }
    }
    // Wrap selection with term-tag
    wrap(range: Range) {
        const m = document.createElement(this.tag);
        m.classList.add(Monospace.CSS);
        /** SurroundContent throws an error if the Range splits a non-Text node with only one of its boundary points
         *  @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Range/surroundContents}
         *  // range.surroundContents(span);
         */
        m.appendChild(range.extractContents());
        range.insertNode(m);
    
        // Expand (add) selection to highlighted block
        this.api.selection.expandToTag(m);
    }
    // Unwrap term-tag
    unwrap(termWrapper: HTMLElement) {
        // Expand selection to all term-tag
        this.api.selection.expandToTag(termWrapper);

        const sel = window.getSelection();
        if (sel) {
            const range = sel.getRangeAt(0);
            const unwrappedContent = range.extractContents();
        
            // Remove empty term-tag
            if (termWrapper.parentNode) {
                termWrapper.parentNode.removeChild(termWrapper);
            }
        
            // Insert extracted content
            range.insertNode(unwrappedContent);
        
            // Restore selection
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
    checkState() {
        const termTag = this.api.selection.findParentTag(this.tag, Monospace.CSS);
        if (this.button) {
            this.button.classList.toggle(this.iconClasses.active, !!termTag);
        }
    }
    static get sanitize() {
        return {
            code: {
                class: Monospace.CSS,
            },
        };
    }

    static get toolbox() {
        return {
            icon: 'M',
            title: 'Monospace'
        };
    }
}

/**
 * Initialize the EditorJS instance for the docs tab.
 * If data is provided, it will be used to populate the editor.
 * If data is not provided, or is false, the editor
 * will be initialized with an empty document.
 * @param {Object} data
 */
export function initializeDocs(data: OutputData | null = null, holder = 'docs-tab'): void {
    const config: Partial<EditorConfig> = {
        holder,
        tools: {
            underline: Underline,
            monospace: {
                class: Monospace,
                inlineToolbar: true,
            },
            header: Header,
            paragraph: Paragraph,
            table: Table,
        },
        logLevel: LogLevels.ERROR,
        readOnly: holder === 'ref-docs',
    };

    if (data) config.data = data;
    const editor = new EditorJS(config);
    if (holder === 'docs-tab') docsEditor.set(editor);
}
