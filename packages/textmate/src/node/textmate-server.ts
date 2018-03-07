/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from "inversify";
import { TextMateServer, TextMateClient } from "../common/textmate-protocol";
import { ModeServiceImpl } from './modeService';
import { TextMateService } from './TMSyntax';
import { TokenizationRegistry } from '../common/modes';
import { LineTokens } from '../common/line-tokens';
import { ModesRegistry } from '../common/modesRegistry';

@injectable()
export class TextMateServerImpl implements TextMateServer {

    private service: TextMateService;
    private modeService: ModeServiceImpl;
    constructor() {
        this.modeService = new ModeServiceImpl();
        this.service = new TextMateService(this.modeService);
        ModesRegistry.registerLanguage({
            id: "typescript",
            extensions: ['.ts'],
            aliases: ["typescript", 'ts'],
            mimetypes: ['text/typescript']
        });
    }

    parse(fileName: string, text: string[]): Promise<number[][]> {
        const service = this.service;
        return this.modeService.getOrCreateModeByFilenameOrFirstLine("test.ts").then(mode =>
            new Promise<number[][]>((resolve, reject) => {
                service.onDidEncounterLanguage(e => {
                    console.log(e);
                });
                const result: number[][] = [];
                const tokenizer = TokenizationRegistry.get(mode.getId());
                let state = tokenizer.getInitialState();
                for (const line of text) {
                    const tokenList = tokenizer.tokenize2(line, state, 0);
                    state = tokenList.endState;
                    LineTokens.convertToEndOffset(tokenList.tokens, line.length);
                    result.push(Array.from(tokenList.tokens));
                }
                resolve(result);
            }));
    }
    dispose(): void {
        // noop
    }
    setClient(client: TextMateClient | undefined): void {
        // this.client = client;
    }

}
