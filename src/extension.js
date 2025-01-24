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

		if (!editor) {
            return;
        }

		// Get the configuration settings
		const ConvertTextConstants = vscode.workspace.getConfiguration().get('mlelementtoprefixcomment.convertTextConst');
		const ConvertReportLabels = vscode.workspace.getConfiguration().get('mlelementtoprefixcomment.convertReportLabel');

        const documentText = editor.document.getText();
        const mlMatches = MLElement.FindAllMatches(documentText);

		if (ConvertTextConstants) {
			var textConstMatches = TextConst.FindAllMatches(documentText);
		}
		if (ConvertReportLabels) {
			var reportLabelMatches = ReportLabel.FindAllMatches(documentText);
		}

        editor.edit(editBuilder => {
            mlMatches.forEach(match => {
                editBuilder.replace(match.range, MLElement.ConvertToComment(match.match));
            });
			if (ConvertTextConstants) {
				textConstMatches.forEach(match => {
					editBuilder.replace(match.range, TextConst.ConvertToComment(match.match));
				});
			}
			if (ConvertReportLabels) {
				reportLabelMatches.forEach(match => {
					editBuilder.replace(match.range, ReportLabel.ConvertToComment(match.match));
				});
			}
        });
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

	// Gets the allowed prefixes for MLElements
	static GetAllowedPrefixes() {
		const MLElementPrefixes = vscode.workspace.getConfiguration().get('mlelementtoprefixcomment.MLElementPrefixes');
		return MLElementPrefixes;
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

	// Finds all the MLElements in the input text
	static FindAllMatches(InputText) {
        const allowedPrefixes = this.GetAllowedPrefixes().join('|');
        const regex = new RegExp(`(${allowedPrefixes})\\s*=\\s*[A-Z]{3}\\s*=\\s*'[^']*'(?:,\\s*[A-Z]{3}\\s*=\\s*'[^']*')*;`, 'g');
        let match;
        const matches = [];
        while ((match = regex.exec(InputText)) !== null) {
            const startPos = match.index;
            const endPos = regex.lastIndex;
            const start = InputText.slice(0, startPos).split('\n').length - 1;
            const end = InputText.slice(0, endPos).split('\n').length - 1;
			const startChar = startPos - InputText.lastIndexOf('\n', startPos - 1) - 1;
            const endChar = endPos - InputText.lastIndexOf('\n', endPos - 1) - 1;

            matches.push({
                match: match[0],
                range: new vscode.Range(start, startChar, end, endChar)
            });
        }
        return matches;
    }
}

class TextConst{

	// Ensures the input text is a valid TextConst
    static Validate(InputText) {
        const regex = new RegExp(`^\\s*\\w+\\s*:\\s*TextConst\\s+[A-Z]{3}\\s*=\\s*'[^']*'(?:,\\s*[A-Z]{3}\\s*=\\s*'[^']*')*;\\s*$`, 'g');
        return regex.test(InputText);
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

	// Converts the TextConst to a Prefix and Comment
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

        const variableName = InputText.split(':')[0].trim();
        return `${variableName}: Label '${caption}', Comment = '${comments}';`;
    }

	// Finds all the TextConsts in the input text
    static FindAllMatches(InputText) {
        const regex = new RegExp(`\\w+\\s*:\\s*TextConst\\s+[A-Z]{3}\\s*=\\s*'[^']*'(?:,\\s*[A-Z]{3}\\s*=\\s*'[^']*')*;`, 'g');
        let match;
        const matches = [];
        while ((match = regex.exec(InputText)) !== null) {
            const startPos = match.index;
            const endPos = regex.lastIndex;
            const startLine = InputText.slice(0, startPos).split('\n').length - 1;
            const endLine = InputText.slice(0, endPos).split('\n').length - 1;
            const startChar = startPos - InputText.lastIndexOf('\n', startPos - 1) - 1;
            const endChar = endPos - InputText.lastIndexOf('\n', endPos - 1) - 1;

            matches.push({
                match: match[0],
                range: new vscode.Range(startLine, startChar, endLine, endChar)
            });
        }
        return matches;
    }
}

class ReportLabel {

    static Validate(InputText) {
        const regex = new RegExp(`^\\s*label\\s*\\(\\s*\\w+\\s*;\\s*[A-Z]{3}\\s*=\\s*'[^']*'(?:,\\s*[A-Z]{3}\\s*=\\s*'[^']*')*\\)\\s*$`, 'g');
        return regex.test(InputText);
    }

    static GetML(InputText, MLCode) {
        const regex = new RegExp(`${MLCode}\\s*=\\s*'([^']*)'`, 'i');
        const match = InputText.match(regex);
        return match ? match[1] : null;
    }

    static ListTags(InputText) {
        const regex = /([A-Z]{3})\s*=\s*'[^']*'/g;
        let match;
        const tags = [];
        while ((match = regex.exec(InputText)) !== null) {
            tags.push(match[1]);
        }
        return tags;
    }

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

        const labelName = InputText.match(/label\s*\(\s*(\w+)\s*;/)[1];
        return `${labelName} = '${caption}', Comment = '${comments}';`;
    }

    static FindAllMatches(InputText) {
        const regex = new RegExp(`label\\s*\\(\\s*\\w+\\s*;\\s*[A-Z]{3}\\s*=\\s*'[^']*'(?:,\\s*[A-Z]{3}\\s*=\\s*'[^']*')*\\)`, 'g');
        let match;
        const matches = [];
        while ((match = regex.exec(InputText)) !== null) {
            const startPos = match.index;
            const endPos = regex.lastIndex;
            const startLine = InputText.slice(0, startPos).split('\n').length - 1;
            const endLine = InputText.slice(0, endPos).split('\n').length - 1;
            const startChar = startPos - InputText.lastIndexOf('\n', startPos - 1) - 1;
            const endChar = endPos - InputText.lastIndexOf('\n', endPos - 1) - 1;

            matches.push({
                match: match[0],
                range: new vscode.Range(startLine, startChar, endLine, endChar)
            });
        }
        return matches;
    }
}
