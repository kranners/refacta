import * as ts from "typescript";
import * as vscode from "vscode";

export type AstNode = {
    kind: string;
    text: string;
    pos: number;
    flags?: ts.NodeFlags;
    index?: number;
    children: AstNode[] | undefined;
};

export type DocumentContext = {
    document: vscode.TextDocument;
    cursor: vscode.Position;
    source: ts.SourceFile;
};

/**
 * Converts a VSCode position into a TS source position.
 *
 * @param cursor A VSCode position for a given document.
 * @param source A TS SourceFile which the position belongs to.
 * @returns
 */
export const getSourcePositionFromVscode = (
    cursor: vscode.Position,
    source: ts.SourceFile
) => {
    return source.getPositionOfLineAndCharacter(cursor.line, cursor.character);
};

/**
 * Generates a minified version of the AST from a given node, cascading down.
 * To generate the entire AST of a file, pass the SourceFile as both the node and source.
 *
 * @param node A node in a given source, usually the SourceFile itself.
 * @param source A SourceFile which contains the given node.
 * @returns
 */
export const astAtNode = (node: ts.Node, source: ts.SourceFile): AstNode => {
    // Get the node's syntax kind and text.
    const kind = ts.SyntaxKind[node.kind];
    const text = node.getFullText(source);

    // Recurse the children down below this node.
    const children: AstNode[] = node
        .getChildren()
        .map((child) => astAtNode(child, source));

    return {
        kind,
        text,
        pos: node.pos,
        flags: node.flags,
        children,
    };
};

export const getActiveDocumentContext = (): DocumentContext | undefined => {
    // Load the current document from the VSCode API
    const document = vscode.window.activeTextEditor?.document;
    const cursor = vscode.window.activeTextEditor?.selection.active;

    // If there is nothing open, just return.
    if (document === undefined || cursor === undefined) {
        return;
    }

    // Create a new TypeScript API source file
    const source = ts.createSourceFile(
        document.fileName,
        document.getText(),
        ts.ScriptTarget.Latest,
        true
    );

    return { document, cursor, source };
};

/**
 * Traverses the AST to do a depth-first search for the most deeply nested node at a given position.
 *
 * @param node A given node, generally will be a SourceFile
 * @param pos A zero-based position, not line number or character number.
 * @returns The most nested (most specific) node that falls in that range.
 */
export const getAstNodeAtPosition = (
    node: ts.Node,
    pos: number
): ts.Node | undefined => {
    // Iterate while we're still iterating over nodes.
    while (node.kind >= ts.SyntaxKind.FirstNode) {
        // Get all the children that fall within the range of our given position.
        const validChildren = ts.forEachChild(node, (child) => {
            // If the child contains the position, it's valid.
            if (child.pos <= pos && child.end > pos) {
                return child;
            }

            // Otherwise, it's invalid.
            return undefined;
        });

        // If we have no valid children, break here, this is the deepest node!
        if (validChildren === undefined) {
            return node;
        }

        node = validChildren;
    }

    return node;
};

/**
 * Grabs the TS node which the cursor is currently placed over in the VSCode active text editor.
 *
 * @returns The active TS node being hovered by the user.
 */
export const getActiveNode = (): ts.Node | undefined => {
    const context = getActiveDocumentContext();

    if (context === undefined) {
        return;
    }

    const { cursor, source } = context;
    const position = getSourcePositionFromVscode(cursor, source);

    return getAstNodeAtPosition(source, position);
};

/**
 * Takes in a node that may be a child of an IfStatement. Will either return its' containing IfStatement, or undefined.
 *
 * @param node The node that is possibly contained inside an if statement.
 */
export const getContainingIfStatement = (
    node: ts.Node
): ts.Node | undefined => {
    while (!ts.isIfStatement(node)) {
        if (ts.isSourceFile(node.parent)) {
            return undefined;
        }

        node = node.parent;
    }

    return node;
};

/**
 * Takes in an if statement node and returns if it is a part of an if/else statement or not.
 * i.e. This is true:
 *
 * if (bool) {} else {};
 *
 * This is false:
 *
 * if (bool) {} else if (otherBool) {};
 *
 * @param node An if statement node.
 * @returns
 */
export const isIfElseStatement = (node: ts.Node): boolean => {
    // If this isn't an if statement at all, leave.
    if (!ts.isIfStatement(node)) {
        return false;
    }

    return node.getChildren().filter(ts.isBlock).length > 1;
};
