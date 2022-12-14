/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import {
    Button
} from '@patternfly/react-core';
import '../karavan.css';
import {ErrorHandlerDefinition} from "karavan-core/lib/model/CamelDefinition";
import DeleteIcon from "@patternfly/react-icons/dist/js/icons/times-circle-icon";

interface Props {
    errorHandler: ErrorHandlerDefinition
    deleteElement: (element: ErrorHandlerDefinition) => void
}

export class ErrorHandlerCard extends React.Component<Props, any> {

    delete = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        this.props.deleteElement.call(this, this.props.errorHandler);
    }

    render() {
        return (
            <div className="rest-card rest-card-selected">
                <div className="header">
                    <div className="title">Error Handler</div>
                    <div className="description">Global error handler for the RouteBuilder</div>
                    <Button variant="link" className="delete-button" onClick={e => this.delete(e)}><DeleteIcon/></Button>
                </div>
            </div>
        );
    }
}
