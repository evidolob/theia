/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import * as chai from 'chai';
import 'mocha';
import * as chaiAsPromised from 'chai-as-promised';
// import { testContainer } from './test/inversify.spec-config';
import { TextMateService } from './TMSyntax';
import { ModeServiceImpl, } from './modeService';
import { TokenizationRegistry } from '../common/modes';
import { ModesRegistry } from '../common/modesRegistry';
import { LineTokens } from '../common/line-tokens';
chai.use(chaiAsPromised);
/**
 * Globals
 */

const expect = chai.expect;

describe('TMSyntax', function () {

    it('load TS', function () {
        ModesRegistry.registerLanguage({
            id: "typescript",
            extensions: ['.ts'],
            aliases: ["typescript", 'ts'],
            mimetypes: ['text/typescript']
        });
        const mode = new ModeServiceImpl();
        new TextMateService(mode);
        mode.getOrCreateModeByFilenameOrFirstLine("test.ts");
        return new Promise((res, rej) => {
            TokenizationRegistry.onDidChange(e => {
                const ts = TokenizationRegistry.get("typescript");
                const init = ts.getInitialState();
                const line = "import { aaa } from 'fs';\n";
                const t = ts.tokenize2(line, init, 0);
                console.log(JSON.stringify(t.tokens));
                LineTokens.convertToEndOffset(t.tokens, 0);
                const json = JSON.stringify(Array.from(t.tokens));
                console.log(json);
                const arr = JSON.parse(json);
                const ua = new Uint32Array(arr);
                expect(ua).to.be.equal(t.tokens);

                res();
            });
        });

        // return expect(ts).to.be;
    }).timeout(5000);
});
