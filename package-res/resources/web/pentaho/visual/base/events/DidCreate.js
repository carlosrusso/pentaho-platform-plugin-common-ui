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
  "../../../lang/Event",
  "pentaho/util/error"
], function(Event, error) {
  "use strict";


  return Event.extend("pentaho.visual.base.events.DidCreate", {

      constructor: function(source, element) {
        if(!element) throw error.argRequired("element");

        this.base("did:create", source, false);
        this._element = element;
      },
      
      get element() {
        return this._element;
      }

    }, {

      get type() {
        return "did:create";
      }

    });

});
