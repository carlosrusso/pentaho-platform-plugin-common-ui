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
  "./OwnedChange"
], function(OwnedChange) {
  "use strict";

  /**
   * @name Clear
   * @memberOf pentaho.type.changes
   * @class
   * @extends pentaho.type.changes.OwnedChange
   * @amd pentaho/type/changes/Clear
   *
   * @classDesc Describes an operation that clears the elements of a list.
   *
   * @constructor
   * @description Creates an instance.
   *
   */
  return OwnedChange.extend("pentaho.type.changes.Clear", /** @lends pentaho.type.changes.Clear# */{

    constructor: function() {
    },

    /**
     * @inheritdoc
     */
    get type() {
      return "clear";
    },

    /**
     * @inheritdoc
     */
    apply: function(list) {
      list._elems = [];
      list._keys = {};
      return list;
    }
  });
});
