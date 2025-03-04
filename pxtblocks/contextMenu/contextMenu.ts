/// <reference path="../../built/pxtlib.d.ts" />
import * as Blockly from "blockly";
import { registerWorkspaceItems } from "./workspaceItems";
import { onWorkspaceContextMenu } from "../external";
import { registerBlockitems } from "./blockItems";

export function initContextMenu() {
    const msg = Blockly.Msg;

    // FIXME (riknoll): Not all of these are still used
    msg.DUPLICATE_BLOCK = lf("{id:block}Duplicate");
    msg.DUPLICATE_COMMENT = lf("Duplicate Comment");
    msg.REMOVE_COMMENT = lf("Remove Comment");
    msg.ADD_COMMENT = lf("Add Comment");
    msg.EXTERNAL_INPUTS = lf("External Inputs");
    msg.INLINE_INPUTS = lf("Inline Inputs");
    msg.EXPAND_BLOCK = lf("Expand Block");
    msg.COLLAPSE_BLOCK = lf("Collapse Block");
    msg.ENABLE_BLOCK = lf("Enable Block");
    msg.DISABLE_BLOCK = lf("Disable Block");
    msg.DELETE_BLOCK = lf("Delete Block");
    msg.DELETE_X_BLOCKS = lf("Delete Blocks");
    msg.DELETE_ALL_BLOCKS = lf("Delete All Blocks");
    msg.HELP = lf("Help");

    // c.f. https://github.com/google/blockly/blob/rc/v11.1.1/core/workspace_svg.ts#L1675
    Blockly.WorkspaceSvg.prototype.showContextMenu = function (e: PointerEvent) {
        const menuOptions = Blockly.ContextMenuRegistry.registry.getContextMenuOptions(
            Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
            {workspace: this},
        );

        // Allow the developer to add or modify menuOptions.
        if (this.configureContextMenu) {
            this.configureContextMenu(menuOptions, e);
        }

        Blockly.ContextMenu.show(e, menuOptions, this.RTL, this);
    };

    // c.f. https://github.com/google/blockly/blob/rc/v11.1.1/core/block_svg.ts#L201
    Blockly.BlockSvg.prototype.initSvg = function () {
        if (this.initialized) return;
        for (const input of this.inputList) {
            input.init();
        }
        for (const icon of this.getIcons()) {
            icon.initView((this as any).createIconPointerDownListener(icon));
            icon.updateEditable();
        }
        this.applyColour();
        this.pathObject.updateMovable(this.isMovable() || this.isInFlyout);
        const svg = this.getSvgRoot();
        if (svg) {
            Blockly.browserEvents.conditionalBind(
                svg,
                'pointerdown',
                this,
                (this as any).onMouseDown_,
            );
        }

        if (!svg.parentNode) {
            this.workspace.getCanvas().appendChild(svg);
        }
        this.initialized = true;
    };

    // c.f. https://github.com/google/blockly/blob/rc/v11.1.1/core/block_svg.ts#L573
    // @ts-ignore
    Blockly.BlockSvg.prototype.generateContextMenu = function() {
        if (!this.contextMenu) {
            return null;
        }

        const menuOptions = Blockly.ContextMenuRegistry.registry.getContextMenuOptions(
            Blockly.ContextMenuRegistry.ScopeType.BLOCK,
            {block: this},
        );

        // Allow the block to add or modify menuOptions.
        if (this.customContextMenu) {
            this.customContextMenu(menuOptions);
        }

        return menuOptions;
    };

    registerWorkspaceItems();
    registerBlockitems();
}

export function setupWorkspaceContextMenu(workspace: Blockly.WorkspaceSvg) {
    try {
        Blockly.ContextMenuItems.registerCommentOptions();
    }
    catch (e) {
        // will throw if already registered. ignore
    }
    workspace.configureContextMenu = (options, e) => {
        onWorkspaceContextMenu(workspace, options);
    };
}