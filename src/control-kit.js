import validateOption from 'validate-option';
import validateType from './util/validate-type';
import validateDescription from './util/validate-description';
import createHtml from './util/create-html';

import Reference from './reference';
import css from './style';
import Panel, {
    DefaultConfig as PanelDefaultConfig,
    AlignmentH as PanelAlignmentH,
    AlignmentV as PanelAlignmentV
} from './group/panel';
import ComponentOptions from './component/component-options';
import ColorPicker from './component/color-picker';


/*--------------------------------------------------------------------------------------------------------------------*/
// Template / Defaults
/*--------------------------------------------------------------------------------------------------------------------*/

const template = `<section id="control-kit"></section>`;

/**
 * Default Control Kit config
 * @type {Object}
 * @property {Boolean} enabled
 * @property {Number} opacity
 * @property {Boolean} stateSaveLoad
 * @property {String} shortcutCharHide
 */
export const DefaultConfig = Object.freeze({
    element : null,
    enabled : true,
    opacity : 1.0,
    stateLoadSave : false,
    shortcutCharHide : 'h',
    useExternalStyle : false
});
/*--------------------------------------------------------------------------------------------------------------------*/
// Control Kit
/*--------------------------------------------------------------------------------------------------------------------*/

export default class ControlKit{
    /**
     * @constructor
     * @param config
     */
    constructor(config){
        config = validateOption(config,DefaultConfig);

        // state
        this._state = {
            enabled : config.enabled,
            opacity: config.opacity,
            stateLoadSave : config.stateLoadSave,
            shortcutCharHide: config.shortcutCharHide,
        };

        // style
        if(!config.useExternalStyle){
            const head = document.head || document.querySelector('head');
            const style = document.createElement('style');
            style.type = 'text/css';
            if(style.stylesheet){
                style.stylesheet.cssText = css;
            } else {
                style.appendChild(document.createTextNode(css));
            }
            head.appendChild(style);
        }

        this._panels = [];

        // element
        this._element = (config.element || document.body).appendChild(createHtml(template));

        // listeners
        const onResize = ()=>{
            this.updatePanelAutoPosition();
        };
        const onKeyPress = (e)=>{
            if(e.key !== this._state.shortcutCharHide.toUpperCase() || !e.ctrlKey || !e.shiftKey){
                return;
            }
            this.enable = !this.enable;
        };
        window.addEventListener('resize',onResize);
        document.addEventListener('keypress',onKeyPress);

        this._removeEventListeners = ()=>{
            window.removeEventListener('resize',onResize);
            document.removeEventListener('keypress',onKeyPress);
        };

        // init options
        const options = ComponentOptions.sharedOptions();
        this._element.appendChild(options.element);

        // init picker
        const picker = ColorPicker.sharedPicker();
        this._element.appendChild(picker.element);
        picker.x = window.innerWidth * 0.5 - picker.width * 0.5;
        picker.y = window.innerHeight * 0.5 - picker.height * 0.5;

        // init
        this.stateLoadSave = this._state.stateSaveLoad;
    }

    get(id_or_ids){
        if(id_or_ids instanceof Array){
            const items = new Array(id_or_ids.length);
            for(let i = 0; i < items.length; ++i){
                items[i] = Reference.get(id_or_ids[i]);
            }
            return items;
        }
        return Reference.get(id_or_ids);
    }

    /**
     * Updates auto layout panels position.
     */
    updatePanelAutoPosition(){
        const ptl = [0,0];
        const ptr = [0,0];
        const pbl = [0,0];
        const pbr = [0,0];
        const ptls = [0,0];
        const ptrs = [0,0];
        const pbls = [0,0];
        const pbrs = [0,0];

        for(const panel of this._panels){
            if(panel.fixed){
                continue;
            }

            let pt, pts, pb, pbs, side, sideop;

            // left aligned
            if(panel.alignh == PanelAlignmentH.LEFT){
                pt = ptl;
                pts = ptls;
                pb = pbl;
                pbs = pbls;
                side = 'left';
                sideop = 'right';
            }
            // right aligned
            else {
                pt = ptr;
                pts = ptrs;
                pb = pbr;
                pbs = pbrs;
                side = 'right';
                sideop = 'left';
            }

            const style = panel.element.style;

            switch(panel.alignv){
                // bottom stack
                case PanelAlignmentV.BOTTOM_STACK:
                    style[side] = pbs[0] + 'px';
                    style[sideop] = null;
                    style.top = null;
                    style.bottom  = pbs[1] + 'px';
                    pb[0] += pb[0] == 0 ? panel.width : 0;
                    pbs[1] += panel.height;
                    break;
                // bottom
                case PanelAlignmentV.BOTTOM:
                    style[side] = pb[0] + 'px';
                    style[sideop] = null;
                    style.top = null;
                    style.bottom = pb[1] + 'px';
                    pb[0] += panel.width;
                    pbs[0] += pbs[0] == 0 ? panel.width : 0;
                    break;
                // top stack
                case PanelAlignmentV.TOP_STACK:
                    style[side] = pts[0] + 'px';
                    style[sideop] = null;
                    style.top = pts[1] + 'px';
                    style.bottom = null;
                    pt[0] += pt[0] == 0 ? panel.width : 0;
                    pts[1] += panel.height;
                    break;
                // top
                case PanelAlignmentV.TOP:
                default:
                    style[side] = pt[0] + 'px';
                    style[sideop] = null;
                    style.top = pt[1] + 'px';
                    style.bottom = null;
                    pt[0] += panel.width;
                    pts[0] += pts[0] == 0 ? panel.width : 0;
                    break;
            }
        }
    }

    _removeEventListeners(){}

    /**
     * Returns ths last active panel.
     * @return {Panel}
     * @private
     */
    _backPanelValid(){
        if(this._panels.length == 0){
            this.addPanel();
        }
        return this._panels[this._panels.length - 1];
    }

    /**
     * Adds a new panel to the control kit.
     * @param config
     * @return {*}
     */
    addPanel(config){
        this._panels.push(new Panel(this,config));
        this.updatePanelAutoPosition();
        return this._panels[this._panels.length - 1];
    }

    /**
     * Creates a panel from description.
     * @param description
     * @example
     * //create empty panel
     * controlkit.add({
     *     label: 'panel'
     * });
     * @example
     * //create panel with group
     * controlKit.add({
     *     label : 'panel',
     *     groups : [
     *         {label : 'group a'},
     *         {label : 'group b'}
     *     ]
     * });
     * @example
     * //create panel with groups and sub-groups
     * controlKit.add({
     *     label : 'panel',
     *     groups : [{
     *         label : 'group a',
     *         subGroups : [
     *             {label : 'sub-group a'},
     *             {label : 'sub-group b'}
     *         ]
     *     }]
     * });
     * @example
     * //create panel with groups, sub-groups and components
     * controlKit.add({
     *     label : 'panel',
     *     groups : [{
     *         label : 'group a',
     *         subGroups : [{
     *             label : 'sub-group a',
     *             components : [
     *                 {type:'number',object:obj,key:'property0'},
     *                 {type:'slider',object:obj,key:'property0',range:[0,1]}
     *             ]
     *         }]
     *     }]
     * });
     * @example
     * //create panel with single auto-created group, sub-groups and components
     * controlKit.add({
     *     label : 'panel',
     *     subGroups : [{
     *         label : 'sub-group a',
     *         components : [
     *             {type:'number',object:obj,key:'property0'},
     *             {type:'slider',object:obj,key:'property0',range:[0,1]}
     *         ]
     *     }]
     * });
     * @example
     * //create panel with single auto-created group, sub-groups and components
     * controlKit.add({
     *     label : 'panel',
     *     components : [
     *         {type:'number',object:obj,key:'property0'},
     *         {type:'slider',object:obj,key:'property0',range:[0,1]}
     *     ]
     * });
     * @example
     * //assumptions
     *
     * //creates an empty panel
     * controlKit.add({});
     *
     * //creates two empty panels
     * controlKit.add([
     *     {},
     *     {}
     * ]);
     *
     * //creates a default panel + group with two sub-groups including components
     * controlKit.add([
     *     {label: 'group a', components : [{type:'number',object:obj,key:'propertyA'}]},
     *     {label: 'group a', components : [{type:'number',object:obj,key:'propertyB'}]]},
     * ]);
     *
     * //creates a default panel + group + sub-group structure from an array of components
     * controlKit.add([
     *      {type:'number',object:obj,key:'property0'},
     *      {type:'slider',object:obj,key:'property0',range:[0,1]}
     * ])
     */
    add(description){
        //array of descriptions
        if(description instanceof Array){
            for(const item of description){
                this.add(item);
            }
            return this;
        }
        if(!description.groups){
            throw new Error('Invalid panel description. Groups missing. Use {...,groups:[...]}.')
        }
        validateType(description.groups,Array);
        const config = validateDescription(description,PanelDefaultConfig,['groups']);
        this.addPanel(config);
        this._backPanelValid().add(description.groups);
        return this;
    }

    /**
     * If false all control kit panels are hidden.
     * @param value
     */
    set enable(value){
        this._state.enabled = value;
        for(const panel of this._panels){
            panel.enable = value;
        }
    }

    /**
     * Returns true if control kit is enabled.
     * @return {*}
     */
    get enable(){
        return this._state.enabled;
    }

    /**
     * Returns the underlying root HTMLElement.
     * @return {HTMLElement}
     */
    get element(){
        return this._element;
    }

    /**
     * Syncs all component values.
     */
    sync(){
        for(const panel of this._panels){
            panel.sync();
        }
    }

    /**
     * Saves the current component state.
     */
    saveConfig(){}

    /**
     * Loads component states from external object.
     */
    loadConfig(state){}

    /**
     * If true state load and save functionality is enabled.
     * @param {Boolean} enable
     */
    set stateLoadSave(enable){
        this._state.stateSaveLoad = enable;
        if(this._state.stateLoadSave){
            this._element.classList.remove('state-load-save-disabled');
        } else {
            this._element.classList.add('state-load-save-disabled');
        }
    }

    /**
     * Returns true if state load and save functionality is enabled.
     * @return {Boolean}
     */
    get stateLoadSave(){
        return this._state.stateSaveLoad;
    }

    /**
     * Saves the current control kit layout configuration.
     */
    saveLayout(){};

    /**
     * Loads an external control kit layout configuration.
     */
    loadLayout(){};

    /**
     * Completely removes all panels and components.
     */
    destroy(){
        for(const panel of this._panels){
            panel.destroy();
        }
        this._panels = [];
    };

    getState(){
        const state = Object.assign({},this._state);
        state.panels = this._panels.map((item)=>{return item.getState()});
        return state;
    }
}