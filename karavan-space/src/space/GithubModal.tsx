import React from 'react';
import {
    Button,
    Modal,
    FormGroup,
    ModalVariant,
    Form,
    TextInputGroupMain, TextInputGroup, Switch, FlexItem, Flex, TextInput
} from '@patternfly/react-core';
import '../designer/karavan.css';
import {GithubApi, GithubParams} from "../api/GithubApi";
import GithubImageIcon from "@patternfly/react-icons/dist/esm/icons/github-icon";
import {StorageApi} from "../api/StorageApi";
import {KameletApi} from "../../../karavan-core/lib/api/KameletApi";
import {ComponentApi} from "../../../karavan-core/lib/api/ComponentApi";
import {SpaceBus} from "./SpaceBus";

interface Props {
    yaml: string,
    filename: string,
    isOpen: boolean,
    onClose: () => void
}

interface State {
    token?: string
    owner?: string
    repo?: string
    path?: string
    branch?: string
    name?: string
    email?: string
    message?: string
    save: boolean
    pushing: boolean
}

export class GithubModal extends React.Component<Props, State> {

    public state: State = {
        token: '',
        owner: '',
        repo: '',
        branch: '',
        name: '',
        email: '',
        message: 'Add a new Camel integration',
        save: false,
        pushing: false,
        path: this.props.filename
    }

    componentDidMount() {
        const githubParams = StorageApi.getGithubParameters();
        if (githubParams) {
            this.setState({
                owner: githubParams.owner,
                repo: githubParams.repo,
                path: githubParams.path,
                message: githubParams.message,
                name: githubParams.name,
                email: githubParams.email,
                branch: githubParams.branch ? githubParams.branch : "main",
                save: true
            })
        }
        this.githubAuth();
    }

    githubAuth = () => {
        GithubApi.auth(
            (result: any) => {
                const onlyToken =  StorageApi.getGithubParameters() != undefined;
                if (onlyToken){
                    this.setState({token: result.token})
                } else {
                    this.githubData(result.token);
                }
            },
            reason => {
                SpaceBus.sendAlert('Error', reason.toString(), 'danger');
            });
    }

    githubData = (token: string) => {
        Promise.all([
            GithubApi.getUserInfo(token),
            GithubApi.getUserEmails(token),
        ]).then(responses =>
            Promise.all(responses.map(response => response.data))
        ).then(data => {
            const name: string =( data[0] as any).name || '';
            const login: string =( data[0] as any).login || '';
            const email: string = (Array.isArray(data[1]) ? Array.from(data[1]).filter(d => d.primary === true)?.at(0)?.email : '') || '';
            this.setState({token: token, name: name, email:email, owner: login})
        }).catch(err =>
            SpaceBus.sendAlert('Error', err.toString(), 'danger')
        );
    }

    closeModal = () => {
        this.props.onClose?.call(this);
    }

    saveAndCloseModal = () => {
        this.setState({pushing: true});
        const {owner, repo, path, name, email, message, branch, save, token} = this.state;
        if (owner && repo && path && name && email && message && branch && token) {
            const githubParams: GithubParams = {
                owner: owner,
                repo: repo,
                path: path,
                name: name,
                email: email,
                message: message,
                branch: branch
            };
            if (save) {
                StorageApi.setGithubParameters(githubParams)
            }
            GithubApi.pushFile(
                githubParams,
                token, this.props.yaml,
                result => {
                    this.setState({pushing: false});
                    SpaceBus.sendAlert('Success', "Saved");
                    this.props.onClose?.call(this)
                },
                reason => {
                    SpaceBus.sendAlert('Error', reason.toString(), 'danger');
                    this.setState({pushing: false});
                }
            )
        }
    }

    render() {
        const {token, owner, repo, path, name, email, message, branch, save, pushing} = this.state;
        const pushEnabled = !pushing && token && token && owner && repo && path && name && email && message && branch;
        return (
            <Modal
                title="Github Commit Parameters"
                className="github-modal"
                variant={ModalVariant.medium}
                isOpen={this.props.isOpen}
                onClose={this.closeModal}
                actions={[
                    <Button isLoading={pushing} isDisabled={!pushEnabled} key="confirm" variant="primary" onClick={this.saveAndCloseModal}>Push</Button>,
                    <Button key="cancel" variant="secondary" onClick={this.closeModal}>Cancel</Button>,
                    <Button style={{marginLeft: "auto"}} key="login" variant="secondary" onClick={this.githubAuth} icon={<GithubImageIcon/>}>Login</Button>
                ]}
            >
                <Form autoComplete="off" isHorizontal className="create-file-form">
                    <FormGroup label="Repository" fieldId="repository" isRequired>
                        <Flex direction={{default: "row"}} justifyContent={{default: "justifyContentSpaceBetween"}} alignItems={{default: "alignItemsStretch"}}>
                            <FlexItem>
                                <TextInput id="owner" placeholder="Owner" value={owner} onChange={value => this.setState({owner: value})}/>
                            </FlexItem>
                            <FlexItem>
                                <TextInput id="repo" placeholder="Repo" value={repo} onChange={value => this.setState({repo: value})}/>
                            </FlexItem>
                            <FlexItem>
                                <TextInput id="path" placeholder="Path" value={path} onChange={value => this.setState({path: value})}/>
                            </FlexItem>
                            <FlexItem>
                                <TextInput id="branch" placeholder="branch" value={branch} onChange={value => this.setState({branch: value})}/>
                            </FlexItem>
                        </Flex>
                    </FormGroup>
                    <FormGroup label="Commit user" fieldId="user" isRequired>
                        <Flex direction={{default: "row"}} justifyContent={{default: "justifyContentSpaceBetween"}} alignItems={{default: "alignItemsStretch"}}>
                            <FlexItem>
                                <TextInput id="username" placeholder="Username" value={name} onChange={value => this.setState({name: value})}/>
                            </FlexItem>
                            <FlexItem flex={{default: "flex_3"}}>
                                <TextInput id="email" placeholder="Email" value={email} onChange={value => this.setState({email: value})}/>
                            </FlexItem>
                        </Flex>
                    </FormGroup>
                    <FormGroup label="Commit message" fieldId="commitMessage" isRequired>
                        <TextInputGroup className="input-group">
                            <TextInputGroupMain id="message" value={message} onChange={value => this.setState({message: value})}/>
                        </TextInputGroup>
                    </FormGroup>
                    <FormGroup label="Token" fieldId="token" isRequired>
                        <TextInputGroup className="input-group">
                            <TextInputGroupMain id="token" type="password" value={token} onChange={value => this.setState({token: value})}/>
                        </TextInputGroup>
                    </FormGroup>
                    <FormGroup label="Save" fieldId="save" isRequired>
                        <TextInputGroup className="input-group">
                            <Switch label="Save parameters in browser (except token)" checked={save} onChange={checked => this.setState({save: checked})}/>
                        </TextInputGroup>
                    </FormGroup>
                </Form>
            </Modal>
        )
    }
}