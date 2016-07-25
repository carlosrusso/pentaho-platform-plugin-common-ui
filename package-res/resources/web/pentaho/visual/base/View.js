/*!
 * Copyright 2010 - 2016 Pentaho Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
  "pentaho/lang/Base",
  "pentaho/lang/EventSource",
  "./events/DidCreate",
  "./events/WillUpdate",
  "./events/DidUpdate",
  "./events/RejectedUpdate",
  "pentaho/lang/UserError",
  "pentaho/data/filter",
  "pentaho/util/BitSet",
  "pentaho/util/error",
  "pentaho/util/logger",
  "pentaho/shim/es6-promise"
], function(Base, EventSource, DidCreate, WillUpdate, DidUpdate, RejectedUpdate, UserError,
            filter, BitSet, error, logger, Promise) {

  "use strict";

  // Allow ~0
  // jshint -W016

  /**
   * @name pentaho.visual.base.View
   * @memberOf pentaho.visual.base
   * @class
   * @extends pentaho.lang.Base
   * @implements pentaho.lang.IDisposable
   *
   * @abstract
   * @amd pentaho/visual/base/View
   *
   * @classDesc This is the base class for visualizations.
   *
   * A container is expected to instantiate a `View` with a reference to a `Model` instance,
   * which may not be immediately valid.
   *
   * Over time, the container mutates the `Model` instance and triggers events.
   * In response, the method [_onModelChange]{@link pentaho.visual.base.View#_onModelChange} is
   * invoked to process the events, which may cause the `View` to update itself.
   *
   * @description Initializes a `View` instance.
   *
   * @constructor
   * @param {pentaho.visual.base.Model} model - The base visualization `Model`.
   */

  var View = Base.extend(/** @lends pentaho.visual.base.View# */{

    constructor: function(model) {

      if(!model)
        throw error.argRequired("model");

      /**
       * The DOM node where the visualization is rendered.
       *
       * @type {?(Node|Text|HTMLElement)}
       * @private
       */
      this._domNode = null;

      /**
       * Gets the model of the visualization.
       *
       * @type {!pentaho.visual.base.Model}
       * @readOnly
       */
      this.model = model;

      /**
       * Indicates if an update is in progress.
       *
       * @type {boolean}
       * @private
       */
      this._isUpdating = false;

      /**
       * Indicates if there has been at least one successful full update.
       *
       * @type {boolean}
       * @private
       */
      this._hasUpdateFull = false;

      /**
       * Indicates if the view is automatically updated whenever the model is changed.
       *
       * @type {boolean}
       * @private
       * @default true
       */
      this._isAutoUpdate = true;

      /**
       * The set of dirty regions of the view.
       *
       * @type {!pentaho.lang.BitSet}
       * @protected
       * @readOnly
       */
      this._dirtyRegions = new BitSet(View.REGIONS.ALL); // mark view as initially dirty

      /**
       * The model's "did:change" event registration handle.
       *
       * @type {!pentaho.lang.IEventRegistrationHandle}
       */
      this._handleDidChange = model.on("did:change", this._processModelChange.bind(this));

      this._init();
    },

    /**
     * Initializes the visualization.
     *
     * This method is invoked by the constructor of `pentaho.visual.base.View`.
     * Override this method to perform initialization tasks,
     * such as setting up event listeners.
     *
     * @protected
     */
    _init: function() {
    },

    /**
     * Gets the view's DOM node.
     *
     * @type {?(Node|Text|HTMLElement)}
     */
    get domNode() {
      return this._domNode;
    },

    /**
     * Sets the DOM node that the visualization will use to render itself.
     *
     * @param {!(Node|Text|HTMLElement)} domNode - The visualization's DOM node.
     *
     * @protected
     *
     * @throws {pentaho.lang.OperationInvalidError} When the DOM node has already been set to a different value.
     */
    _setDomNode: function(domNode) {
      if(!domNode) throw error.argRequired("domNode");

      if(this._domNode && domNode !== this._domNode)
        throw error.operInvalid("Can't change the visualization dom node once it is set.");

      this._domNode = domNode;
    },

    /**
     * Gets the context of the view's model.
     *
     * This getter is syntax sugar for `this.model.type.context`.
     *
     * @type {pentaho.type.Context}
     */
    get context() {
      return this.model.type.context;
    },

    /**
     * Gets a value that indicates if an update is in progress.
     *
     * @type {boolean}
     */
    get isUpdating() {
      return this._isUpdating;
    },

    /**
     * Gets or sets a value that enables or disables automatic updates of the visualization.
     *
     * Note: Setting this property to `true` does not force the visualization to update itself.
     *
     * @type {boolean}
     */
    get isAutoUpdate() {
      return this._isAutoUpdate;
    },

    set isAutoUpdate(value) {
      this._isAutoUpdate = !!value;
    },

    /**
     * Gets a value that indicates if the view is currently in a dirty state.
     *
     * @see pentaho.visual.base.View#isAutoUpdate
     *
     * @type {boolean}
     */
    get isDirty() {
      return !this._dirtyRegions.isEmpty;
    },

    /**
     * Orchestrates the rendering of the visualization and is meant to be invoked by the container.
     *
     * Executes [_update]{@link pentaho.visual.base.View#_update} asynchronously in
     * the will/did/rejected event loop associated with an update of a visualization,
     * and also creates the visualization DOM node the first time it successfully updates.
     *
     * In order to get the visualization DOM node,
     * listen to the {@link pentaho.visual.base.events.DidCreate|"did:create"} event.
     *
     * @return {Promise} A promise that is fulfilled when the visualization
     * is completely rendered. If the visualization is in an invalid state, the promise
     * is immediately rejected.
     *
     * @fires "will:update"
     * @fires "did:update"
     * @fires "rejected:update"
     * @fires "did:create"
     */
    update: function() {

      if(this.isUpdating)
        return Promise.reject(new Error("Previous update still in progress!"));

      this._isUpdating = true;

      return (this._onUpdateWill() || this._updateCycle())
          .then(this._onUpdateDid.bind(this), this._onUpdateRejected.bind(this));
    },

    /**
     * @private
     */
    _onUpdateWill: function() {

      if(this._hasListeners(WillUpdate.type)) {

        var willUpdate = new WillUpdate(this);

        if(!this._emitSafe(willUpdate))
          return Promise.reject(willUpdate.cancelReason);
      }
    },

    /**
     * @private
     */
    _onUpdateDid: function() {
      // First successful update?
      if(!this._hasUpdateFull) {

        if(!this._domNode)
          return this._onUpdateRejected(new UserError("View did not set a DOM node."));

        this._hasUpdateFull = true;

        if(this._hasListeners(DidCreate.type))
          this._emitSafe(new DidCreate(this));
      }

      // J.I.C.
      this._dirtyRegions.clear();
      this._isUpdating = false;

      // ---

      if(this._hasListeners(DidUpdate.type))
        this._emitSafe(new DidUpdate(this));
    },

    /**
     * @private
     */
    _onUpdateRejected: function(reason) {

      this._isUpdating = false;

      // ---

      if(this._hasListeners(RejectedUpdate.type))
        this._emitSafe(new RejectedUpdate(this, reason));

      return Promise.reject(reason);
    },

    /**
     * Updates a visualization.
     *
     * If the visualization is valid, the visualization element will be created on the first update
     * and proceed with the visualization update; otherwise, it will be rejected and prevent the update.
     *
     * @return {Promise} A promise that is fulfilled when the visualization
     * is completely rendered. If the visualization is in an invalid state, the promise
     * is immediately rejected.
     *
     * @private
     */
    _updateCycle: function() {

      var dirtyRegions = this._dirtyRegions;
      if(dirtyRegions.isEmpty)
        return Promise.resolve();

      var validationErrors = this._validate();
      if(validationErrors) {
        var error = "View model is invalid:\n - " +
          (Array.isArray(validationErrors) ? validationErrors.join("\n - ") : validationErrors);

        return Promise.reject(new UserError(error));
      }

      // ---

      var updateInfo = this._getUpdateMethod(dirtyRegions);

      var me = this;
      try {
        return Promise.resolve(updateInfo.method.call(this))
          .then(function() {

            dirtyRegions.clear(updateInfo.mask);

            return me._updateCycle();
          });

      } catch(e) {
        return Promise.reject(e);
      }
    },

    /**
     * @protected
     */
    _getUpdateMethod: function(dirtyRegions) {

      var firstRenderer = {
        mask:   View.REGIONS.ALL,
        method: this._update
      };

      if(!dirtyRegions.is(View.REGIONS.ALL)) {
        var renderRegistry = [
          {
            mask:   View.REGIONS.SIZE,
            method: this._updateSize
          }, {
            mask:   View.REGIONS.SELECTION, // In CCC: View.REGIONS.SIZE + View.REGIONS.SELECTION
            method: this._updateSelection
          }
        ];

        renderRegistry.some(function(renderer) {
          if(dirtyRegions.isSubsetOf(renderer.mask)) {
            firstRenderer = renderer;
            return true;
          }
        });
      }

      return firstRenderer;
    },

    /**
     * Validates the current state of the visualization.
     *
     * By default, this method simply calls {@link pentaho.visual.base.Model#validate}
     * to validate the model.
     *
     * @return {?Array.<!pentaho.type.ValidationError>} A non-empty array of errors or `null`.
     * @protected
     */
    _validate: function() {
      return this.model.validate();
    },

    /**
     * Determines if the visualization is in a valid state.
     *
     * A visualization in an invalid state should not be rendered.
     *
     * @return {boolean} Returns `true` if this visualization is valid, or `false` if not valid.
     * @protected
     * @see pentaho.visual.base.View#_validate
     */
    _isValid: function() {
      return !this._validate();
    },

    /**
     * Renders the visualization.
     *
     * Subclasses of `pentaho.visual.base.View` must override this method
     * and implement a complete rendering of the visualization.
     *
     * @protected
     * @abstract
     */
    _update: function() {
      throw error.notImplemented("_update");
    },

    /**
     * Updates the visualization, taking into account that
     * only the dimensions have changed.
     *
     * Subclasses of `pentaho.visual.base.View` are expected to override this method to
     * implement a fast and cheap resizing of the visualization.
     * By default, this method invokes [_update]{@link pentaho.visual.base.View#_update}.
     *
     * @protected
     */
    _updateSize: function() {
      this._update();
    },

    /**
     * Updates the visualization, taking into account that
     * only the selection has changed.
     *
     * Subclasses of `pentaho.visual.base.View` are expected to override this method
     * with an implementation that
     * updates the selection state of the items displayed by this visualization.
     * By default, this method invokes [_update]{@link pentaho.visual.base.View#_update}.
     *
     * @protected
     */
    _updateSelection: function() {
      this._update();
    },

    /**
     * @private
     */
    _processModelChange: function(event) {

      this._onModelChange(event.changeset);

      if(this.isAutoUpdate) {

        this.update().then(function() {
          logger.info("Auto-update succeeded!");
        }, function(errors) {
          logger.warn("Auto-update canceled:\n - " +
              (Array.isArray(errors) ? errors.join("\n - ") : errors));
        });
      }
    },

    /**
     * Decides how the visualization should react
     * to a modification of its properties.
     *
     * If the [isAutoUpdate]{@link pentaho.visual.base.View#isAutoUpdate} flag is set to `false`,
     * this method returns immediately an no changes are processed.
     *
     * By default, this method selects the cheapest reaction to a change of properties.
     * It invokes:
     * - [_updateSize]{@link pentaho.visual.base.View#_updateSize} when either of the properties
     * [width]{@link pentaho.visual.base.Model.Type#width} or
     * [height]{@link pentaho.visual.base.Model.Type#height} change,
     * - [_updateSelection]{@link pentaho.visual.base.View#_updateSelection} when the property
     * [selectionFilter]{@link pentaho.visual.base.Model.Type#selectionFilter} changes
     * - [_update]{@link pentaho.visual.base.View#_update} when any other property changes.
     *
     * Subclasses of `pentaho.visual.base.View` can override this method to
     * extend the set of fast render methods.
     *
     * @see pentaho.visual.base.View#_updateSize
     * @see pentaho.visual.base.View#_updateSelection
     * @see pentaho.visual.base.View#_update
     *
     * @param {!pentaho.type.Changeset} changeset - Map of the properties that have changed.
     *
     * @protected
     */
    _onModelChange: function(changeset) {

      var exclusionList = {
        width: true,
        height: true,
        selectionMode: true, // never has a direct visual impact
        selectionFilter: true
      };

      var isFullyDirty = changeset.propertyNames.some(function(p) { return !exclusionList[p]; });
      if(isFullyDirty) {

        this._dirtyRegions.set();

      } else {

        var isSizeDirty = changeset.hasChange("width") || changeset.hasChange("height");
        if(isSizeDirty) this._dirtyRegions.set(View.REGIONS.SIZE);

        var isSelectionDirty = changeset.hasChange("selectionFilter");
        if(isSelectionDirty) this._dirtyRegions.set(View.REGIONS.SELECTION);

      }
    },

    /**
     * Called before the visualization is discarded.
     */
    dispose: function() {
      this._domNode = null;

      if(this._handleDidChange) {
        this.model.off(this._handleDidChange);
        this._handleDidChange = null;
      }
    }
  }, {
    REGIONS: {
      NONE:       0,
      SIZE:       1,
      SELECTION:  2,
      ALL:       ~0
    }
  })
  .implement(EventSource);

  return View;
});
