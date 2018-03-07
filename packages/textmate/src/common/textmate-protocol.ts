/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { JsonRpcServer } from '@theia/core';

export const tmPath = "/services/textmate";

export interface TextMateClient {
}

export const TextMateServer = Symbol("TextMateServer");

export interface TextMateServer extends JsonRpcServer<TextMateClient> {
    parse(fileName: string, text: string[]): Promise<number[][]>;
}
