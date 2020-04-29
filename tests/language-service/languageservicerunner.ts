/// <reference path="../../built/pxtcompiler.d.ts"/>


import * as fs from 'fs';
import * as path from 'path';

import "mocha";
import * as chai from "chai";

import * as util from "../common/testUtils";

const casesDir = path.join(process.cwd(), "tests", "language-service", "cases");
const testPackage = path.relative(process.cwd(), path.join("tests", "language-service", "test-package"));


interface CompletionTestCase {
    fileName: string;
    fileText: string;
    isPython: boolean;
    position: number;
    wordStartPos: number;
    wordEndPos: number;
    expectedSymbols: string[];
}

function initGlobals() {
    let g = global as any
    g.pxt = pxt;
    g.ts = ts;
    g.pxtc = pxtc;
    g.btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
    g.atob = (str: string) => Buffer.from(str, "base64").toString("binary");
}

initGlobals();
pxt.setAppTarget(util.testAppTarget);

describe("language service", () => {
    const cases = getTestCases();

    for (const testCase of cases) {
        it("get completions " + testCase.fileName + testCase.position, () => {
            return runCompletionTestCaseAsync(testCase);
        });
    }
})

function getTestCases() {
    const filenames: string[] = [];
    for (const file of fs.readdirSync(casesDir)) {
        if (file[0] == ".") {
            continue;
        }

        const filename = path.join(casesDir, file);
        if (file.substr(-3) === ".ts") {
            filenames.push(filename);
        }
    };

    const testCases: CompletionTestCase[] = [];

    for (const fileName of filenames) {
        const fileText = fs.readFileSync(fileName, { encoding: "utf8" });
        const isPython = fileName.substr(-3) !== ".ts";

        const lines = fileText.split("\n");
        let position = 0;

        for (const line of lines) {
            const commentString = isPython ? "#" : "//";
            const commentIndex = line.indexOf(commentString);
            if (commentIndex !== -1) {
                const comment = line.substr(commentIndex + commentString.length).trim();
                const expectedSymbols = comment.split(";").map(s => s.trim());

                const dotPosition = position + line.substring(0, commentIndex).lastIndexOf(".");

                testCases.push({
                    fileName,
                    fileText,
                    isPython,
                    expectedSymbols,
                    position: dotPosition + 1,
                    wordStartPos: dotPosition + 1,
                    wordEndPos: dotPosition + 1,
                })
            }

            position += line.length;
        }
    }

    return testCases;
}

function runCompletionTestCaseAsync(testCase: CompletionTestCase) {
    return getOptionsAsync(testCase.fileText)
        .then(opts => {
            setOptionsOp(opts);
            ensureAPIInfoOp();
            const result = completionsOp(
                "main.ts",
                testCase.position,
                testCase.wordStartPos,
                testCase.wordEndPos,
                testCase.fileText
            );

            for (const sym of testCase.expectedSymbols) {
                chai.assert(result.entries.some(s => (testCase.isPython ? s.pyQName : s.qName) === sym), `Did not receive symbol '${sym}'`);
            }
        })
}

function getOptionsAsync(fileContent: string) {
    const packageFiles: pxt.Map<string> = {};
    packageFiles["main.ts"] = fileContent;

    return util.getTestCompileOptsAsync(packageFiles, testPackage, true);
}

function ensureAPIInfoOp() {
    pxtc.service.performOperation("apiInfo", {});
}

function setOptionsOp(opts: pxtc.CompileOptions) {
    return pxtc.service.performOperation("setOptions", {
        options: opts
    });
}

function completionsOp(fileName: string, position: number, wordStartPos: number, wordEndPos: number, fileContent?: string): pxtc.CompletionInfo {
    return pxtc.service.performOperation("getCompletions", {
        fileName,
        fileContent,
        position,
        wordStartPos,
        wordEndPos,
        runtime: pxt.appTarget.runtime
    });
}