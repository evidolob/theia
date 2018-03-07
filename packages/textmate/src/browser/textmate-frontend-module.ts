/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule, interfaces } from 'inversify';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { TextMateColorizer } from './textmate-colorizer';
import { tmPath, TextMateServer } from "../common/textmate-protocol";
import { TextMateFrontendContribution } from "./textmate-frontend-contribution";
import { FrontendApplicationContribution } from "@theia/core/lib/browser";

export default new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind) => {
    bind(TextMateServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        // const terminalWatcher = ctx.container.get(TextMateServer);
        return connection.createProxy<TextMateServer>(tmPath, {});
    }).inSingletonScope();

    bind(TextMateColorizer).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).to(TextMateFrontendContribution).inSingletonScope();
});
