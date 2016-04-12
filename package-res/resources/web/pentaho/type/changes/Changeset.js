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
  "./Change"
], function(Change) {
  "use strict";

  /**
   * @name Changeset
   * @memberOf pentaho.type.changes
   * @class
   * @extends pentaho.type.changes.Change
   * @amd pentaho/type/changes/Changeset
   * @abstract
   *
   * @classDesc Class that describes a set of modifications to an object.
   *
   * @constructor
   * @description Creates an instance.
   *
   * @param {!pentaho.type.Value} owner - The [value]{@link pentaho.type.Value} associated with this change.
   */
  return Change.extend("pentaho.type.changes.Changeset", /** @lends pentaho.type.changes.Changeset# */{
    constructor: function(owner) {
      this._owner = owner;
      this._newValue = undefined;
      this._oldValue = undefined;
    },


    /**
     * The [value object]{@linkplain pentaho.type.Value} associated with this changeset.
     *
     * @type {!pentaho.type.Value}
     * @readonly
     */
    get owner() {
      return this._owner;
    },

    /**
     * Asserts if this changeset contains any defined changes.
     *
     * @return {boolean} `true` if at least one change is defined, `false` otherwise.
     * @abstract
     */
    hasChanges: function() {
      return false;
    },

    /**
     * Removes all changes in this changeset.
     */
    clearChanges: function() {
    },


    /**
     * A preview of the value of the object after the changes are made.
     *
     * @type {!pentaho.type.Value}
     * @readonly
     */
    get newValue() {
      return this._newValue;
    },

    /**
     * The value of the object before the changes are made.
     *
     * @type {!pentaho.type.Value}
     * @readonly
     */
    get oldValue() {
      return this._oldValue;
    },

    /**
     * Modifies the value of the provided object.
     *
     * @method
     * @param {!pentaho.type.Value} value - The object to be modified.
     * @abstract
     */
    apply: function(value){

    }

  });

});