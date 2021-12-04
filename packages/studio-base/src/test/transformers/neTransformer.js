// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as nearley from "nearley";
import * as compile from "nearley/lib/compile.js";
import * as generate from "nearley/lib/generate.js";
import * as nearleyGrammar from "nearley/lib/nearley-language-bootstrapped.js";

export default {
  // From https://nearley.js.org/docs/using-in-frontend
  process(sourceText) {
    // Parse the grammar source into an AST
    const grammarParser = new nearley.Parser(nearleyGrammar);
    grammarParser.feed(sourceText);
    const grammarAst = grammarParser.results[0]; // TODO check for errors

    // Compile the AST into a set of rules
    const grammarInfoObject = compile(grammarAst, {});
    // Generate JavaScript code from the rules
    const grammarJs = generate(grammarInfoObject, "grammar");

    return grammarJs;
  },
};
