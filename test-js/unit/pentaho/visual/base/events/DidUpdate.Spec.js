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
  "pentaho/lang/Event",
  "pentaho/visual/base/events/DidUpdate",
  "tests/pentaho/util/errorMatch"
], function(Event, DidUpdate, errorMatch) {
  "use strict";

  /* global describe:false, it:false, expect:false, beforeEach:false */

  describe("pentaho.visual.base.events.DidUpdate -", function() {
    var type = "update";

    it("should extend Event", function() {
      expect(DidUpdate.prototype instanceof Event).toBe(true);
    });

    it("static property type should return full type name", function() {
      expect(DidUpdate.type).toBe("did:" + type);
    });

    it("static property type should be read-only", function() {
      expect(function() {
        DidUpdate.type = "New Name";
      }).toThrowError(TypeError);
    });

    describe("instances -", function() {
      var event;

      beforeEach(function() {
        event = new DidUpdate({});
      });

      it("should extend Event", function() {
        expect(event instanceof Event).toBe(true);
      });

      it("should not be cancelable", function() {
        expect(event.isCancelable).toBe(false);
      });

    });

  }); // #pentaho.visual.base.events.DidUpdate

});
