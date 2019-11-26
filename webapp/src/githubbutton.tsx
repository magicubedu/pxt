import * as React from "react";
import * as sui from "./sui";
import * as pkg from "./package";
import * as cloudsync from "./cloudsync";

interface GithubButtonProps extends pxt.editor.ISettingsProps {
    className?: string;
}

interface GithubButtonState {
    pushPulling?: boolean;
}

export class GithubButton extends sui.UIElement<GithubButtonProps, GithubButtonState> {
    constructor(props: GithubButtonProps) {
        super(props);
        this.state = {};
        this.handleClick = this.handleClick.bind(this);
        this.handleButtonKeydown = this.handleButtonKeydown.bind(this);
        this.createRepository = this.createRepository.bind(this);
    }

    private handleButtonKeydown(e: React.KeyboardEvent<HTMLElement>) {
        e.stopPropagation();
    }

    private createRepository(e: React.MouseEvent<HTMLElement>) {
        pxt.tickEvent("github.button.create", undefined, { interactiveConsent: true });
        const { projectName, header } = this.props.parent.state;
        cloudsync.githubProvider().createRepositoryAsync(projectName, header)
            .done(r => r && this.props.parent.reloadHeaderAsync());
    }

    private handleClick(e: React.MouseEvent<HTMLElement>) {
        e.stopPropagation();
        const { header } = this.props.parent.state;
        if (!header) return;

        const { githubId } = header;
        if (!githubId) return;

        pxt.tickEvent("github.button.nav")
        const gitf = pkg.mainEditorPkg().lookupFile("this/" + pxt.github.GIT_JSON);
        if (gitf)
            this.props.parent.setSideFile(gitf);
    }

    renderCore() {
        const header = this.props.parent.state.header;
        if (!header) return <div />;

        const { githubId } = header;
        const ghid = pxt.github.parseRepoId(githubId);
        const defaultCls = "ui icon button editortools-btn editortools-github-btn"
        // new github repo
        if (!ghid)
            return <sui.Button key="githubcreatebtn" className={`${defaultCls} ${this.props.className || ""}`}
                icon="github" title={lf("create GitHub repository")} ariaLabel={lf("create GitHub repository")}
                onClick={this.createRepository} />

        // existing repo
        const meta: pkg.PackageGitStatus = this.getData("pkg-git-status:" + header.id);
        const modified = meta && !!meta.modified;
        const repoName = ghid.project && ghid.tag ? `${ghid.project}${ghid.tag == "master" ? "" : `#${ghid.tag}`}` : ghid.fullName;
        const title = lf("Review and commit changes for {0}", repoName);

        return <div key="githubeditorbtn" role="button" className={`${defaultCls} ${this.props.className || ""}`}
            title={title} onClick={this.handleClick}>
            <i className="github icon" />
            {modified ? <i className="ui long arrow alternate up icon mobile hide" /> : undefined}
        </div>;
    }
}
