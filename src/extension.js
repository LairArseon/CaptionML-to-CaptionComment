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
	console.log('Congratulations, your extension "captionmltocaptioncomment" is now active!');
	console.log(context);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand

	const UpdateText = vscode.commands.registerCommand('captionmltocaptioncomment.UpdateText', function () {
		// The code you place here will be executed every time your command is executed

		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;

		if (!editor) {
			return;
		}


		if (selection && !selection.isEmpty) {
			const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
			var highlighted = editor.document.getText(selectionRange);

			if(!CaptionML.Validate(highlighted))
				{
					vscode.window.showErrorMessage('Selected text: "' + highlighted + '" is not valid');
				} else {
					vscode.window.showInformationMessage('Selected text is valid');
					editor.edit(editBuilder => {
						editBuilder.replace(selection, CaptionML.ConvertToComment(highlighted));
					})
				}
		}
	});
	context.subscriptions.push(UpdateText);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

class CaptionML{

	// Ensures the input text is a valid CaptionML
    static Validate(InputText) {
		const regex = /CaptionML\s*=\s*([A-Z]{3})\s*=\s*'[^']*'(?:,\s*([A-Z]{3})\s*=\s*'[^']*')*;/g;
        return InputText.match(regex);
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

	// Converts the CaptionML to a Caption and Comment
	static ConvertToComment(InputText) {
        const tags = this.ListTags(InputText);
        let caption = this.GetML(InputText, 'ENU');
        if (!caption && tags.length > 0) {
            caption = this.GetML(InputText, tags[0]);
        }

        const comments = tags
            .filter(tag => tag !== 'ENU')
            .map(tag => `${tag}="${this.GetML(InputText, tag)}"`)
            .join(', ');

        return `Caption = '${caption}', Comment = '${comments}';`;
    }
}
