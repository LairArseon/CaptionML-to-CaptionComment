// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "mlelementtoprefixcomment" is active');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand

	const UpdateText = vscode.commands.registerCommand('mlelementtoprefixcomment.UpdateText', function () {
		// The code you place here will be executed every time your command is executed

		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;

		if (!editor) {
			return;
		}

		// Get the configuration settings
		const selectFullLines = vscode.workspace.getConfiguration().get('mlelementtoprefixcomment.selectFullLines');

		if (selectFullLines) {
			// Adjust the range to include the entire start and end lines
			const startLine = selection.start.line;
			const endLine = selection.end.line;
			const startCharacter = 0;
			const endCharacter = editor.document.lineAt(endLine).text.length;
			
			var selectionRange = new vscode.Range(startLine, startCharacter, endLine, endCharacter);
		} else {
			// Select only the text that was highlighted
			var selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
		}

		if (selection && !selection.isEmpty) {

			var highlighted = editor.document.getText(selectionRange);

			if(!MLElement.Validate(highlighted))
				{
					vscode.window.showErrorMessage('Selected text: "' + highlighted + '" is not valid');
				} else {
					vscode.window.showInformationMessage('Selected text is valid');
					editor.edit(editBuilder => {
						editBuilder.replace(selection, MLElement.ConvertToComment(highlighted));
					})
				}
		}
	});

	const UpdateFullEditorText = vscode.commands.registerCommand('mlelementtoprefixcomment.SearchAndUpdateAllReferencesInActiveEditor', function () {
		const editor = vscode.window.activeTextEditor;
	});

	context.subscriptions.push(UpdateText, UpdateFullEditorText);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

class MLElement{

	// Ensures the input text is a valid MLElement
    static Validate(InputText) {

		const allowedPrefixes = this.GetAllowedPrefixes().join('|');
        const regex = new RegExp(`^\\s*(${allowedPrefixes})\\s*=\\s*[A-Z]{3}\\s*=\\s*'[^']*'(?:,\\s*[A-Z]{3}\\s*=\\s*'[^']*')*;\\s*$`, 'g');
        return InputText.match(regex);
    }

	static GetAllowedPrefixes() {
		return [
			'CaptionML', 
			'ToolTipML', 
			'PromotedActionCategoriesML', 
			'RequestFilterHeadingML',
			'OptionCaptionML'];
	}

	// Gets the value of a specific MLCode
    static GetML(InputText, MLCode) {
        const regex = new RegExp(`${MLCode}\\s*=\\s*'([^']*)'`, 'i');
        const match = InputText.match(regex);
        return match ? match[1] : null;
    }

	// Lists all the MLCodes in the input text
	static ListTags(InputText) {
        const regex = /([A-Z]{3})\s*=\s*'[^']*'/g;
        let match;
        const tags = [];
        while ((match = regex.exec(InputText)) !== null) {
            tags.push(match[1]);
        }
        return tags;
    }

	// Converts the MLElement to a Prefix and Comment
	static ConvertToComment(InputText) {
        const tags = this.ListTags(InputText);
        let caption = this.GetML(InputText, 'ENU');
        if (!caption && tags.length > 0) {
            caption = this.GetML(InputText, tags[0]);
        }

		// Create the comment by listing all the MLCodes except ENU which is the caption
        const comments = tags
            .filter(tag => tag !== 'ENU')
            .map(tag => `${tag}="${this.GetML(InputText, tag)}"`)
            .join(', ');

		// Get the prefix of the MLElement
		const allowedPrefixes = this.GetAllowedPrefixes().join('|');
		const regex = new RegExp(`(${allowedPrefixes})`, 'g');
        const prefixMatch = InputText.match(regex);
        const prefix = prefixMatch[0].replace('ML', '');

        return `${prefix} = '${caption}', Comment = '${comments}';`;
    }
}
