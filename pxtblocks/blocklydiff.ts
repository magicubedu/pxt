namespace pxt.blocks {
    export interface DiffOptions {
        hideDeletedTopBlocks?: boolean;
        renderOptions?: BlocksRenderOptions;
    }

    export interface DiffResult {
        ws?: Blockly.WorkspaceSvg;
        message?: string;
        error?: any;
        svg?: Element;
        deleted: number;
        added: number;
        modified: number;
    }

    export function diffXml(oldXml: string, newXml: string, options?: DiffOptions): DiffResult {
        const oldWs = pxt.blocks.loadWorkspaceXml(oldXml, true);
        const newWs = pxt.blocks.loadWorkspaceXml(newXml, true);
        return diffWorkspace(oldWs, newWs, options);
    }

    const UNMODIFIED_COLOR = "#d0d0d0";
    // Workspaces are modified in place!
    function diffWorkspace(oldWs: Blockly.Workspace, newWs: Blockly.Workspace, options?: DiffOptions): DiffResult {
        try {
            Blockly.Events.disable();
            return diffWorkspaceNoEvents(oldWs, newWs, options);
        }
        catch (e) {
            pxt.reportException(e);
            return {
                ws: undefined,
                message: lf("Oops, we could not diff those blocks."),
                error: e,
                deleted: 0,
                added: 0,
                modified: 0
            }
        } finally {
            Blockly.Events.enable();
        }
    }

    function diffWorkspaceNoEvents(oldWs: Blockly.Workspace, newWs: Blockly.Workspace, options?: DiffOptions): DiffResult {
        pxt.tickEvent("blocks.diff", { started: 1 })
        options = options || {};

        const log = pxt.options.debug || (window && /diffdbg=1/.test(window.location.href))
            ? console.log : (message?: any, ...args: any[]) => { };

        if (!oldWs) {
            return {
                ws: undefined,
                message: lf("All blocks are new."),
                added: 0,
                deleted: 0,
                modified: 1
            }; // corrupted blocks
        }
        if (!newWs) {
            return {
                ws: undefined,
                message: lf("The current blocks seem corrupted."),
                added: 0,
                deleted: 0,
                modified: 1
            }; // corrupted blocks
        }

        // remove all unmodified topblocks
        // when doing a Blocks->TS roundtrip, all ids are trashed.
        const oldXml: pxt.Map<Blockly.Block> = pxt.Util.toDictionary(oldWs.getTopBlocks(false), b => normalizedDom(b, true));
        newWs.getTopBlocks(false)
            .forEach(newb => {
                const newn = normalizedDom(newb, true);
                // try to find by id or by matching normalized xml
                const oldb = oldWs.getBlockById(newb.id) || oldXml[newn];
                if (oldb) {
                    const oldn = normalizedDom(oldb, true);
                    if (newn == oldn) {
                        log(`fast unmodified top `, newb.id);
                        newb.dispose(false);
                        oldb.dispose(false);
                    }
                }
            })

        // we'll ignore disabled blocks in the final output

        const oldBlocks = oldWs.getAllBlocks().filter(b => !b.disabled);
        const oldTopBlocks = oldWs.getTopBlocks(false).filter(b => !b.disabled);
        const newBlocks = newWs.getAllBlocks().filter(b => !b.disabled);
        log(`blocks`, newBlocks.map(b => b.toDevString()));
        log(newBlocks);

        if (oldBlocks.length == 0 && newBlocks.length == 0) {
            pxt.tickEvent("blocks.diff", { moves: 1 })
            return {
                ws: undefined,
                message: lf("Some blocks were moved or changed."),
                added: 0,
                deleted: 0,
                modified: 1
            }; // just moves
        }

        // locate deleted and added blocks
        const deletedTopBlocks = oldTopBlocks.filter(b => !newWs.getBlockById(b.id));
        const deletedBlocks = oldBlocks.filter(b => !newWs.getBlockById(b.id));
        const addedBlocks = newBlocks.filter(b => !oldWs.getBlockById(b.id));

        // clone new workspace into rendering workspace
        const ws = pxt.blocks.initRenderingWorkspace();
        const newXml = pxt.blocks.saveWorkspaceXml(newWs, true);
        pxt.blocks.domToWorkspaceNoEvents(Blockly.Xml.textToDom(newXml), ws);

        // delete disabled blocks from final workspace
        ws.getAllBlocks().filter(b => b.disabled).forEach(b => {
            log('disabled ', b.toDevString())
            b.dispose(false)
        })
        const todoBlocks = Util.toDictionary(ws.getAllBlocks(), b => b.id);
        log(`todo blocks`, todoBlocks)
        logTodo('start')

        // 1. deleted top blocks
        if (!options.hideDeletedTopBlocks) {
            deletedTopBlocks.forEach(b => {
                log(`deleted top ${b.toDevString()}`)
                done(b);
                const b2 = cloneIntoDiff(b);
                done(b2);
                b2.setDisabled(true);
            });
            logTodo('deleted top')
        }

        // 2. added blocks
        addedBlocks.map(b => ws.getBlockById(b.id))
            .filter(b => !!b) // ignore disabled
            .forEach(b => {
                log(`added ${b.toDevString()}`)
                //b.inputList[0].insertFieldAt(0, new Blockly.FieldImage(ADD_IMAGE_DATAURI, 24, 24, false));
                done(b);
            });
        logTodo('added')

        // 3. delete statement blocks
        // inject deleted blocks in new workspace
        const dids: Map<string> = {};
        const deletedStatementBlocks = deletedBlocks
            .filter(b => !todoBlocks[b.id]
                && !isUsed(b)
                && (!b.outputConnection || !b.outputConnection.isConnected()) // ignore reporters
            );
        deletedStatementBlocks
            .forEach(b => {
                const b2 = cloneIntoDiff(b);
                dids[b.id] = b2.id;
                log(`deleted block ${b.toDevString()}->${b2.toDevString()}`)
            })
        // connect deleted blocks together
        deletedStatementBlocks
            .forEach(b => stitch(b));

        // 4. moved blocks
        let modified = 0;
        Util.values(todoBlocks).filter(b => moved(b)).forEach(b => {
            log(`moved ${b.toDevString()}`)
            delete todoBlocks[b.id]
            markUsed(b);
            modified++;
        })
        logTodo('moved')

        // 5. blocks with field properties that changed
        Util.values(todoBlocks).filter(b => changed(b)).forEach(b => {
            log(`changed ${b.toDevString()}`)
            delete todoBlocks[b.id];
            markUsed(b);
            modified++;
        })
        logTodo('changed')

        // delete unmodified top blocks
        ws.getTopBlocks(false)
            .forEach(b => {
                if (!findUsed(b)) {
                    log(`unmodified top ${b.toDevString()}`)
                    delete todoBlocks[b.id];
                    b.dispose(false)
                }
            });
        logTodo('cleaned')

        // all unmodifed blocks are greyed out
        Util.values(todoBlocks).filter(b => !!ws.getBlockById(b.id)).forEach(b => {
            b.setColour(UNMODIFIED_COLOR)
            forceRender(b);
        });

        // if nothing is left in the workspace, we "missed" change
        if (!ws.getAllBlocks().length) {
            pxt.tickEvent("blocks.diff", { missed: 1 })
            return {
                ws,
                message: lf("Some blocks were changed."),
                deleted: deletedBlocks.length,
                added: addedBlocks.length,
                modified: modified
            }
        }

        // make sure everything is rendered
        ws.resize();
        Blockly.svgResize(ws);

        // final render
        const svg = pxt.blocks.renderWorkspace(options.renderOptions || {
            emPixels: 20,
            layout: BlockLayout.Flow,
            aspectRatio: 0.5,
            useViewWidth: true
        });

        // and we're done
        const r: DiffResult = {
            ws,
            svg: svg,
            deleted: deletedBlocks.length,
            added: addedBlocks.length,
            modified: modified
        }
        pxt.tickEvent("blocks.diff", { deleted: r.deleted, added: r.added, modified: r.modified })
        return r;

        function stitch(b: Blockly.Block) {
            log(`stitching ${b.toDevString()}->${dids[b.id]}`)
            const wb = ws.getBlockById(dids[b.id]);
            wb.setDisabled(true);
            markUsed(wb);
            done(wb);
            // connect previous connection to delted or existing block
            const previous = b.getPreviousBlock();
            if (previous) {
                const previousw = ws.getBlockById(dids[previous.id]) || ws.getBlockById(previous.id);
                log(`previous ${b.id}->${wb.toDevString()}: ${previousw.toDevString()}`)
                if (previousw) {
                    // either connected under or in the block
                    if (previousw.nextConnection)
                        wb.previousConnection.connect(previousw.nextConnection);
                    else {
                        const ic = previousw.inputList.slice()
                            .reverse()
                            .find(input => input.connection && input.connection.type == Blockly.NEXT_STATEMENT);
                        if (ic)
                            wb.previousConnection.connect(ic.connection);
                    }
                }
            }
            // connect next connection to delete or existing block
            const next = b.getNextBlock();
            if (next) {
                const nextw = ws.getBlockById(dids[next.id]) || ws.getBlockById(next.id);
                if (nextw) {
                    log(`next ${b.id}->${wb.toDevString()}: ${nextw.toDevString()}`)
                    wb.nextConnection.connect(nextw.previousConnection);
                }
            }
        }

        function markUsed(b: Blockly.Block) {
            (<any>b).__pxt_used = true;
        }

        function isUsed(b: Blockly.Block) {
            return !!(<any>b).__pxt_used;
        }

        function cloneIntoDiff(b: Blockly.Block): Blockly.Block {
            const bdom = Blockly.Xml.blockToDom(b, false);
            const b2 = Blockly.Xml.domToBlock(bdom, ws);
            // disconnect
            if (b2.nextConnection && b2.nextConnection.targetConnection)
                b2.nextConnection.disconnect();
            if (b2.previousConnection && b2.previousConnection.targetConnection)
                b2.previousConnection.disconnect();
            return b2;
        }

        function forceRender(b: Blockly.Block) {
            const a = <any>b;
            a.rendered = false;
            b.inputList.forEach(i => i.fieldRow.forEach(f => {
                f.init();
                if (f.box_) {
                    f.box_.setAttribute('fill', b.getColour())
                    f.box_.setAttribute('stroke', b.getColourTertiary())
                }
            }));
        }

        function done(b: Blockly.Block) {
            b.getDescendants(false).forEach(t => { delete todoBlocks[t.id]; markUsed(t); });
        }

        function findUsed(b: Blockly.Block): boolean {
            return !!b.getDescendants(false).find(c => isUsed(c));
        }

        function logTodo(msg: string) {
            log(`${msg}:`, Util.values(todoBlocks).map(b => b.toDevString()))
        }

        function moved(b: Blockly.Block) {
            const oldb = oldWs.getBlockById(b.id); // extra block created in added step
            if (!oldb)
                return false;

            const newPrevious = b.getPreviousBlock();
            // connection already already processed
            if (newPrevious && !todoBlocks[newPrevious.id])
                return false;
            const newNext = b.getNextBlock();
            // already processed
            if (newNext && !todoBlocks[newNext.id])
                return false;

            const oldPrevious = oldb.getPreviousBlock();
            if (!oldPrevious && !newPrevious) return false; // no connection
            if (!!oldPrevious != !!newPrevious // new connection
                || oldPrevious.id != newPrevious.id) // new connected blocks
                return true;
            const oldNext = oldb.getNextBlock();
            if (!oldNext && !newNext) return false; // no connection
            if (!!oldNext != !!newNext // new connection
                || oldNext.id != newNext.id) // new connected blocks
                return true;
            return false;
        }

        function changed(b: Blockly.Block) {
            let oldb = oldWs.getBlockById(b.id); // extra block created in added step
            if (!oldb)
                return false;

            // normalize
            //oldb = copyToTrashWs(oldb);
            const oldText = normalizedDom(oldb);

            //b = copyToTrashWs(b);
            const newText = normalizedDom(b);

            if (oldText != newText) {
                log(`old ${oldb.toDevString()}`, oldText)
                log(`new ${b.toDevString()}`, newText)
                return true;
            }

            // not changed!
            return false;
        }
    }

    export function mergeXml(xmlA: string, xmlO: string, xmlB: string): string {
        if (xmlA == xmlO) return xmlB;
        if (xmlB == xmlO) return xmlA;

        // TODO merge
        return undefined;
    }

    function normalizedDom(b: Blockly.Block, keepChildren?: boolean): string {
        const dom = Blockly.Xml.blockToDom(b, true);
        normalizeAttributes(dom);
        visDom(dom, (e) => {
            normalizeAttributes(e);
            if (!keepChildren) {
                if (e.localName == "next")
                    e.remove(); // disconnect or unplug not working propertly
                if (e.localName == "statement")
                    e.remove();
            }
        })
        return Blockly.Xml.domToText(dom);
    }

    function normalizeAttributes(e: Element) {
        e.removeAttribute("id");
        e.removeAttribute("x");
        e.removeAttribute("y");
        e.removeAttribute("deletable");
        e.removeAttribute("editable");
        e.removeAttribute("movable")
    }

    function visDom(el: Element, f: (e: Element) => void) {
        if (!el) return;
        f(el);
        for (const child of Util.toArray(el.children))
            visDom(child, f);
    }
}