/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule } from "inversify";
import { ConnectionHandler, JsonRpcConnectionHandler } from "@theia/core/lib/common/messaging";
import { TextMateClient, tmPath, TextMateServer } from "../common/textmate-protocol";
import { TextMateServerImpl } from "./textmate-server";

export default new ContainerModule(bind => {
    bind(TextMateServer).to(TextMateServerImpl).inSingletonScope();

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<TextMateClient>(tmPath, client => {
            const textMateServer = ctx.container.get<TextMateServer>(TextMateServer);
            textMateServer.setClient(client);
            return textMateServer;
        })

    ).inSingletonScope();
});
