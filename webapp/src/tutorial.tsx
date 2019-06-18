/// <reference path="../../built/pxtlib.d.ts" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as data from "./data";
import * as sui from "./sui";
import * as sounds from "./sounds";
import * as core from "./core";
import * as md from "./marked";
import * as compiler from "./compiler";
import * as codecard from "./codecard";
import { HintTooltip } from "./hinttooltip";

type ISettingsProps = pxt.editor.ISettingsProps;

/**
 * We'll run this step when we first start the tutorial to figure out what blocks are used so we can
 * filter the toolbox. 
 */
export function getUsedBlocksAsync(code: string): Promise<pxt.Map<number>> {
    if (!code) return Promise.resolve({});
    const usedBlocks: pxt.Map<number> = {};
    return compiler.getBlocksAsync()
        .then(blocksInfo => {
            pxt.blocks.initializeAndInject(blocksInfo);
            return compiler.decompileBlocksSnippetAsync(code, blocksInfo);
        }).then(blocksXml => {
            if (blocksXml) {
                const headless = pxt.blocks.loadWorkspaceXml(blocksXml);
                if (!headless) {
                    pxt.debug(`used blocks xml failed to load\n${blocksXml}`);
                    throw new Error("blocksXml failed to load");
                }
                const allblocks = headless.getAllBlocks();
                for (let bi = 0; bi < allblocks.length; ++bi) {
                    const blk = allblocks[bi];
                    usedBlocks[blk.type] = 1;
                }
                return usedBlocks;
            } else {
                throw new Error("Empty blocksXml, failed to decompile");
            }
        }).catch((e) => {
            pxt.reportException(e);
            throw new Error(`Failed to decompile tutorial`);
        });
}

export class TutorialMenuItem extends data.Component<ISettingsProps, {}> {
    constructor(props: ISettingsProps) {
        super(props);

        this.openTutorialStep = this.openTutorialStep.bind(this);
    }

    openTutorialStep(step: number) {
        let options = this.props.parent.state.tutorialOptions;
        pxt.tickEvent(`tutorial.step`, { tutorial: options.tutorial, step: step }, { interactiveConsent: true });
        this.props.parent.setTutorialStep(step);
    }

    renderCore() {
        const { tutorialReady, tutorialStepInfo, tutorialStep } = this.props.parent.state.tutorialOptions;
        const currentStep = tutorialStep;
        if (!tutorialReady) return <div />;

        function intermediateClassName(index: number) {
            if (tutorialStepInfo.length < 8 // always show first 8
                || index == 0 // always show first
                || index == tutorialStepInfo.length - 1 // always show last
                || Math.abs(index - currentStep) < 2 // 1 around current step
            ) return "";

            return "mobile hide";
        }

        return <div className="ui item">
            <div className="ui item tutorial-menuitem" role="menubar">
                {tutorialStepInfo.map((step, index) =>
                    (index == currentStep) ?
                        <span className="step-label" key={'tutorialStep' + index}>
                            <TutorialMenuItemLink index={index}
                                className={`ui circular label ${currentStep == index ? 'blue selected' : 'inverted'} ${!tutorialReady ? 'disabled' : ''}`}
                                ariaLabel={lf("Tutorial step {0}. This is the current step", index + 1)}
                                onClick={this.openTutorialStep}>{index + 1}</TutorialMenuItemLink>
                        </span> :
                        <span className={`ui step-label ${intermediateClassName(index)}`} key={'tutorialStep' + index} data-tooltip={`${index + 1}`} data-inverted="" data-position="bottom center">
                            <TutorialMenuItemLink index={index}
                                className={`ui empty circular label ${!tutorialReady ? 'disabled' : ''} clear`}
                                ariaLabel={lf("Tutorial step {0}", index + 1)}
                                onClick={this.openTutorialStep} />
                        </span>
                )}
            </div>
        </div>;
    }
}

interface TutorialMenuItemLinkProps {
    index: number;
    className: string;
    ariaLabel: string;
    onClick: (index: number) => void;
}

export class TutorialMenuItemLink extends data.Component<TutorialMenuItemLinkProps, {}> {

    handleClick = () => {
        this.props.onClick(this.props.index);
    }

    renderCore() {
        const { className, ariaLabel, index } = this.props;
        return <a className={className} role="menuitem" aria-label={ariaLabel} tabIndex={0} onClick={this.handleClick} onKeyDown={sui.fireClickOnEnter}>
            {this.props.children}
        </a>;
    }
}

export interface TutorialHintState {
    visible: boolean;
    showFullText: boolean;
}

export class TutorialHint extends data.Component<ISettingsProps, TutorialHintState> {
    public elementRef: HTMLDivElement;
    protected setRef: (el: HTMLDivElement) => void = (el) => { this.elementRef = el };

    constructor(props: ISettingsProps) {
        super(props);

        this.next = this.next.bind(this);
        this.toggleHint = this.toggleHint.bind(this);
        this.showHint = this.showHint.bind(this);
    }

    next() {
        const options = this.props.parent.state.tutorialOptions;
        const { tutorialStep, tutorial } = options;
        this.setState({ visible: false });
        const nextStep = tutorialStep + 1;

        pxt.tickEvent(`tutorial.hint.next`, { tutorial: tutorial, step: nextStep });
        this.props.parent.setTutorialStep(nextStep);
    }

    toggleHint(showFullText?: boolean) {
        this.showHint(!this.state.visible, showFullText);
    }

    showHint(visible: boolean, showFullText?: boolean) {
        this.setState({ visible, showFullText })
    }

    renderCore() {
        const { visible } = this.state;
        const options = this.props.parent.state.tutorialOptions;
        const { tutorialReady, tutorialStepInfo, tutorialStep, tutorialName } = options;
        if (!tutorialReady) return <div />;

        const step = tutorialStepInfo[tutorialStep];
        const tutorialHint = step.blockSolution;
        const fullText = step.contentMd;

        if (!step.unplugged) {
            if (!tutorialHint) return <div />;

            return <div className={`tutorialhint ${!visible ? 'hidden' : ''}`} ref={this.setRef}>
                <md.MarkedContent markdown={this.state.showFullText ? fullText : tutorialHint} parent={this.props.parent} />
            </div>
        } else {
            let onClick = tutorialStep < tutorialStepInfo.length - 1 ? this.next : this.toggleHint;
            const actions: sui.ModalButton[] = [{
                label: lf("Ok"),
                onclick: onClick,
                icon: 'check',
                className: 'green'
            }]

            return <sui.Modal isOpen={visible} className="hintdialog"
                closeIcon={false} header={tutorialName} buttons={actions}
                onClose={onClick} dimmer={true} longer={true}
                closeOnDimmerClick closeOnDocumentClick closeOnEscape>
                <md.MarkedContent markdown={fullText} parent={this.props.parent} />
            </sui.Modal>
        }
    }
}

interface TutorialCardState {
    popout?: boolean;
    showHintTooltip?: boolean;
    showSeeMore?: boolean;
}

interface TutorialCardProps extends ISettingsProps {
    pokeUser?: boolean;
}

export class TutorialCard extends data.Component<TutorialCardProps, TutorialCardState> {
    private prevStep: number;

    public focusInitialized: boolean;

    constructor(props: ISettingsProps) {
        super(props);
        const options = this.props.parent.state.tutorialOptions;
        this.prevStep = options.tutorialStep;

        this.state = {
            showSeeMore: false,
            showHintTooltip: !options.tutorialStepInfo[this.prevStep].fullscreen
        }

        this.toggleHint = this.toggleHint.bind(this);
        this.hintOnClick = this.hintOnClick.bind(this);
        this.closeLightbox = this.closeLightbox.bind(this);
        this.tutorialCardKeyDown = this.tutorialCardKeyDown.bind(this);
        this.okButtonKeyDown = this.okButtonKeyDown.bind(this);
        this.previousTutorialStep = this.previousTutorialStep.bind(this);
        this.nextTutorialStep = this.nextTutorialStep.bind(this);
        this.finishTutorial = this.finishTutorial.bind(this);
        this.toggleExpanded = this.toggleExpanded.bind(this);

    }

    previousTutorialStep() {
        this.showHint(false); // close hint on new tutorial step
        let options = this.props.parent.state.tutorialOptions;
        const currentStep = options.tutorialStep;
        const previousStep = currentStep - 1;

        options.tutorialStep = previousStep;

        pxt.tickEvent(`tutorial.previous`, { tutorial: options.tutorial, step: previousStep }, { interactiveConsent: true });
        this.props.parent.setTutorialStep(previousStep);
    }

    nextTutorialStep() {
        this.showHint(false); // close hint on new tutorial step
        let options = this.props.parent.state.tutorialOptions;
        const currentStep = options.tutorialStep;
        const nextStep = currentStep + 1;

        options.tutorialStep = nextStep;

        pxt.tickEvent(`tutorial.next`, { tutorial: options.tutorial, step: nextStep }, { interactiveConsent: true });
        this.props.parent.setTutorialStep(nextStep);
    }

    finishTutorial() {
        this.closeLightbox();
        this.removeHintOnClick();
        this.props.parent.completeTutorialAsync().done();
    }

    private closeLightboxOnEscape = (e: KeyboardEvent) => {
        const charCode = core.keyCodeFromEvent(e);
        if (charCode === 27) {
            this.closeLightbox();
        }
    }

    setPopout() {
        this.setState({ popout: true });
    }

    private closeLightbox() {
        sounds.tutorialNext();
        document.documentElement.removeEventListener("keydown", this.closeLightboxOnEscape);

        // Hide lightbox
        this.props.parent.hideLightbox();
        this.setState({ popout: false });
    }

    componentWillUpdate() {
        document.documentElement.addEventListener("keydown", this.closeLightboxOnEscape);
    }

    private tutorialCardKeyDown(e: KeyboardEvent) {
        const charCode = core.keyCodeFromEvent(e);
        if (charCode == core.TAB_KEY) {
            e.preventDefault();
            const tutorialOkRef = this.refs["tutorialok"] as sui.Button;
            const okButton = ReactDOM.findDOMNode(tutorialOkRef) as HTMLElement;
            okButton.focus();
        }
    }

    private okButtonKeyDown(e: KeyboardEvent) {
        const charCode = core.keyCodeFromEvent(e);
        if (charCode == core.TAB_KEY) {
            e.preventDefault();
            const tutorialCard = this.refs['tutorialmessage'] as HTMLElement;
            tutorialCard.focus();
        }
    }

    private lastStep = -1;
    componentDidUpdate(prevProps: ISettingsProps, prevState: TutorialCardState) {
        const options = this.props.parent.state.tutorialOptions;
        const tutorialCard = this.refs['tutorialmessage'] as HTMLElement;
        const tutorialOkRef = this.refs["tutorialok"] as sui.Button;
        const okButton = ReactDOM.findDOMNode(tutorialOkRef) as HTMLElement;
        if (prevState.popout != this.state.popout && this.state.popout) {
            // Setup focus trap around the tutorial card and the ok button
            tutorialCard.addEventListener('keydown', this.tutorialCardKeyDown);
            okButton.addEventListener('keydown', this.okButtonKeyDown);
            tutorialCard.focus();
        } else if (prevState.popout != this.state.popout && !this.state.popout) {
            // Unregister event handlers
            tutorialCard.removeEventListener('keydown', this.tutorialCardKeyDown);
            okButton.removeEventListener('keydown', this.okButtonKeyDown);
            tutorialCard.focus();
        }
        const step = this.props.parent.state.tutorialOptions.tutorialStep;
        if (step != this.lastStep) {
            const animationClasses = `fade ${step < this.lastStep ? "right" : "left"} in visible transition animating`;
            tutorialCard.style.animationDuration = '500ms';
            this.lastStep = step;
            pxsim.U.addClass(tutorialCard, animationClasses);
            Promise.resolve().delay(500)
                .then(() => pxsim.U.removeClass(tutorialCard, animationClasses));
        }
        if (this.prevStep != step) {
            this.setShowSeeMore();
            this.prevStep = step;

            if (!!options.tutorialStepInfo[step].unplugged) {
                this.removeHintOnClick();
            }

            if (!this.state.showHintTooltip) {
                this.showHint(true); // re-bind events after tutorial DOM loaded
            }
        }
    }

    componentDidMount() {
        this.setShowSeeMore();
    }

    componentWillUnmount() {
        // Clear the markdown cache when we unmount
        md.MarkedContent.clearBlockSnippetCache();
        this.lastStep = -1;

        // Clear any existing timers
        this.props.parent.stopPokeUserActivity();

        this.removeHintOnClick();
    }

    private removeHintOnClick() {
        // cleanup hintOnClick
        document.removeEventListener('click', this.hintOnClick);
    }

    toggleExpanded(ev: React.MouseEvent<HTMLDivElement>) {
        ev.stopPropagation();
        ev.preventDefault();
        const options = this.props.parent.state.tutorialOptions;
        const { tutorialStepExpanded } = options;
        this.props.parent.setTutorialInstructionsExpanded(!tutorialStepExpanded);
        return false;
    }

    private hasHint() {
        const options = this.props.parent.state.tutorialOptions;
        const { tutorialReady, tutorialStepInfo, tutorialStep } = options;
        if (!tutorialReady) return false;
        return tutorialStepInfo[tutorialStep].hasHint || tutorialStepInfo[tutorialStep].unplugged;
    }

    private hintOnClick(evt?: any) {
        const options = this.props.parent.state.tutorialOptions;
        if (!options) {
            pxt.reportError("tutorial", "leaking hintonclick");
            return;
        }
        if (evt)
            evt.stopPropagation();
        const { tutorialStepInfo, tutorialStep } = options;
        const step = tutorialStepInfo[tutorialStep];
        const unplugged = tutorialStep < tutorialStepInfo.length - 1 && step && !!step.unplugged;

        if (!unplugged) {
            this.toggleHint();
        }
    }

    private expandedHintOnClick(evt?: any) {
        evt.stopPropagation();
    }

    private setShowSeeMore() {
        // compare scrollHeight of inner text with height of card to determine showSeeMore
        const tutorialCard = this.refs['tutorialmessage'] as HTMLElement;
        let show = false;
        if (tutorialCard && tutorialCard.firstElementChild && tutorialCard.firstElementChild.firstElementChild) {
            show = tutorialCard.clientHeight < tutorialCard.firstElementChild.firstElementChild.scrollHeight;
        }
        this.setState({ showSeeMore: show });
    }

    toggleHint(showFullText?: boolean) {
        const th = this.refs["tutorialhint"] as TutorialHint;
        this.showHint(!(th && th.state && th.state.visible), showFullText);
    }

    showHint(visible: boolean, showFullText?: boolean) {
        if (!this.hasHint()) {
            this.removeHintOnClick();
            return;
        }
        this.closeLightbox();
        const th = this.refs["tutorialhint"] as TutorialHint;
        if (!th) return;

        if (!visible) {
            if (th.elementRef) {
                this.removeHintOnClick();
                th.elementRef.removeEventListener('click', this.expandedHintOnClick);
            }

            this.setState({ showHintTooltip: true });
            this.props.parent.pokeUserActivity();
        } else {
            if (th.elementRef) {
                document.addEventListener('click', this.hintOnClick);
                th.elementRef.addEventListener('click', this.expandedHintOnClick);
            }

            this.setState({ showHintTooltip: false });
            this.props.parent.stopPokeUserActivity();

            const options = this.props.parent.state.tutorialOptions;
            pxt.tickEvent(`tutorial.showhint`, { tutorial: options.tutorial, step: options.tutorialStep });
        }
        th.showHint(visible, showFullText);
    }

    renderCore() {
        const options = this.props.parent.state.tutorialOptions;
        const { tutorialReady, tutorialStepInfo, tutorialStep, tutorialStepExpanded } = options;
        if (!tutorialReady) return <div />
        const tutorialCardContent = tutorialStepInfo[tutorialStep].headerContentMd;

        const currentStep = tutorialStep;
        const maxSteps = tutorialStepInfo.length;
        const hasPrevious = tutorialReady && currentStep != 0;
        const hasNext = tutorialReady && currentStep != maxSteps - 1;
        const hasFinish = currentStep == maxSteps - 1;
        const hasHint = this.hasHint();

        let tutorialAriaLabel = '',
            tutorialHintTooltip = '';
        if (hasHint) {
            tutorialAriaLabel += lf("Press Space or Enter to show a hint.");
            tutorialHintTooltip += lf("Click to show a hint!");
        }

        let hintOnClick = this.hintOnClick;
        // double-click issue on edge when closing hint from tutorial card click
        if ((pxt.BrowserUtils.isEdge() || pxt.BrowserUtils.isIE()) && !this.state.showHintTooltip && !tutorialStepInfo[tutorialStep].unplugged) {
            hintOnClick = null;
        }

        const isRtl = pxt.Util.isUserLanguageRtl();
        return <div id="tutorialcard" className={`ui ${tutorialStepExpanded ? 'tutorialExpanded' : ''} ${tutorialReady ? 'tutorialReady' : ''} ${this.state.showSeeMore ? 'seemore' : ''}  ${this.state.showHintTooltip ? 'showTooltip' : ''} ${hasHint ? 'hasHint' : ''}`} >
            <div className='ui buttons'>
                {hasPrevious ? <sui.Button icon={`${isRtl ? 'right' : 'left'} chevron orange large`} className={`prevbutton left attached ${!hasPrevious ? 'disabled' : ''}`} text={lf("Back")} textClass="widedesktop only" ariaLabel={lf("Go to the previous step of the tutorial.")} onClick={this.previousTutorialStep} onKeyDown={sui.fireClickOnEnter} /> : undefined}
                <div className="ui segment attached tutorialsegment">
                    <div className="avatar-container">
                        <div role="button" className={`avatar-image ${hasHint && this.props.pokeUser ? 'shake' : ''}`} onClick={hintOnClick} onKeyDown={sui.fireClickOnEnter}></div>
                        {hasHint && <sui.Button className="ui circular small label blue hintbutton hidelightbox" icon="lightbulb outline" tabIndex={-1} onClick={hintOnClick} onKeyDown={sui.fireClickOnEnter} />}
                        {hasHint && <HintTooltip ref="hinttooltip" pokeUser={this.props.pokeUser} text={tutorialHintTooltip} onClick={hintOnClick} />}
                        {hasHint && <TutorialHint ref="tutorialhint" parent={this.props.parent} />}
                    </div>
                    <div ref="tutorialmessage" className={`tutorialmessage`} role="alert" aria-label={tutorialAriaLabel} tabIndex={hasHint ? 0 : -1}
                        onClick={hintOnClick} onKeyDown={sui.fireClickOnEnter}>
                        <div className="content">
                            <md.MarkedContent className="no-select" markdown={tutorialCardContent} parent={this.props.parent} />
                        </div>
                        {this.state.showSeeMore && !tutorialStepExpanded ? <sui.Button className="fluid compact attached bottom lightgrey" icon="chevron down" tabIndex={0} text={lf("More...")} onClick={this.toggleExpanded} onKeyDown={sui.fireClickOnEnter} /> : undefined}
                        {this.state.showSeeMore && tutorialStepExpanded ? <sui.Button className="fluid compact attached bottom lightgrey" icon="chevron up" tabIndex={0} text={lf("Less...")} onClick={this.toggleExpanded} onKeyDown={sui.fireClickOnEnter} /> : undefined}
                    </div>
                    <sui.Button ref="tutorialok" id="tutorialOkButton" className="large green okbutton showlightbox" text={lf("Ok")} onClick={this.closeLightbox} onKeyDown={sui.fireClickOnEnter} />
                </div>
                {hasNext ? <sui.Button icon={`${isRtl ? 'left' : 'right'} chevron orange large`} className={`nextbutton right attached ${!hasNext ? 'disabled' : ''}`} text={lf("Next")} textClass="widedesktop only" ariaLabel={lf("Go to the next step of the tutorial.")} onClick={this.nextTutorialStep} onKeyDown={sui.fireClickOnEnter} /> : undefined}
                {hasFinish ? <sui.Button icon="left checkmark" className={`orange right attached ${!tutorialReady ? 'disabled' : ''}`} text={lf("Finish")} ariaLabel={lf("Finish the tutorial.")} onClick={this.finishTutorial} onKeyDown={sui.fireClickOnEnter} /> : undefined}
            </div>
        </div>;
    }
}

export interface ChooseRecipeDialogState {
    visible?: boolean;
}

export class ChooseRecipeDialog extends data.Component<ISettingsProps, ChooseRecipeDialogState> {
    private prevGalleries: pxt.CodeCard[] = [];

    constructor(props: ISettingsProps) {
        super(props);
        this.state = {
            visible: false
        }
        this.close = this.close.bind(this);
    }

    hide() {
        this.setState({ visible: false });
    }

    close() {
        this.setState({ visible: false });
    }

    show() {
        this.setState({ visible: true });
    }

    start(card: pxt.CodeCard) {
        pxt.tickEvent("recipe." + card.url);
        this.hide();
        this.props.parent.startTutorial(card.url, undefined, true);
    }

    fetchGallery(): pxt.CodeCard[] {
        const path = "/recipes";
        let res = this.getData(`gallery:${encodeURIComponent(path)}`) as pxt.gallery.Gallery[];
        if (res) {
            if (res instanceof Error) {
                // ignore
            } else {
                const editor: pxt.CodeCardEditorType = this.props.parent.isJavaScriptActive()
                    ? "js" : this.props.parent.isPythonActive() ? "py"
                        : "blocks";
                this.prevGalleries = pxt.Util.concat(res.map(g =>
                    g.cards.filter(c => c.cardType == "tutorial")
                        .filter(c => (c.editor == editor) || (editor == "blocks" && !c.editor))
                ));
            }
        }
        return this.prevGalleries || [];
    }

    renderCore() {
        const { visible } = this.state;
        if (!visible) return <div />;

        const cards = this.fetchGallery();
        return (
            <sui.Modal isOpen={visible} className="recipedialog"
                size="large"
                onClose={this.close} dimmer={true}
                closeIcon={true} header={lf("Try a Tutorial")}
                closeOnDimmerClick closeOnDocumentClick closeOnEscape
            >
                <div className="group">
                    <div className="ui cards centered" role="listbox">
                        {!cards.length && <div className="ui items">
                            <div className="ui item">
                                {lf("Oops, we couldn't find any tutorials for this editor.")}
                            </div>
                        </div>}
                        {cards.length > 0 ? cards.map(card =>
                            <codecard.CodeCardView
                                key={'card' + card.name}
                                name={card.name}
                                ariaLabel={card.name}
                                description={card.description}
                                imageUrl={card.imageUrl}
                                largeImageUrl={card.largeImageUrl}
                                // tslint:disable-next-line:react-this-binding-issue
                                onClick={() => this.start(card)}
                            />
                        ) : undefined}
                    </div>
                </div>
            </sui.Modal>
        )
    }
}