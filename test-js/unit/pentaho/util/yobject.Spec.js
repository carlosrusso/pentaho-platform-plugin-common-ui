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
  "Squire"
], function(Squire) {
  "use strict";

  /*global describe:false, it:false, expect:false, beforeEach:false, beforeAll:false, Object:false*/

  /**
   * Restrictions:
   *
   * - can't use `pending` within a Squire#require or Squire#run block;
   */

  describe("squire injection in a `describe` block with no mocks: pentaho.util.object - ", function() {

    var Spam, protoEggs, parrot, O;

    beforeEach(function(done) {
      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();

      var injector = new Squire();
      injector.require(["pentaho/util/object"], function(requiredO) {
        O = requiredO;
        done();
      });
    });

    it("should return the input object, if the desired prototype is an object", function() {
      expect(O.setPrototypeOf(parrot, protoEggs)).toBe(parrot);
    });

  });

  describe("squire injection in a `describe` block with a mock: pentaho.util.object -  ", function() {

    var Spam, protoEggs, parrot, O;
    beforeEach(function(done) {
      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();

      var injector = new Squire();
      injector
        .mock({
          "pentaho/shim/env": {
            _label: "setProtoProp",
            has: {
              "Object.setPrototypeOf": false,
              "Object.prototype.__proto__": true
            }
          }
        })
        .require(["pentaho/util/object"], function(requiredO) {
          O = requiredO;
          done();
        });
    });

    it("should return the input object, if the desired prototype is an object", function() {
      expect(O.setPrototypeOf(parrot, protoEggs)).toBe(parrot);
    });
  });

  describe("squire injection in a looped `describe` block with mocks ", function() {

    [{
      _label: "setProtoProp",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "ES5",
      has: {
        "Object.setPrototypeOf": true,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "setProtoCopy",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": false
      }
    }].forEach(function(mock) {
      describe("forcing implementation: " + mock._label + "on pentaho.util.object -  ", function() {

        var Spam, protoEggs, parrot, O;
        beforeEach(function(done) {
          Spam = function() {
            this.bar = "bar";
          };
          Spam.prototype = new (function() {
            this.spam = "spam";
          })();
          parrot = new Spam();

          var myProto = function() {
            this.spam = "eggs";
          };
          protoEggs = new myProto();

          var injector = new Squire();
          injector
            .mock({
              "pentaho/shim/env": mock
            })
            .require(["pentaho/util/object"], function(requiredO) {
              O = requiredO;
              done();
            });
        });

        it("should return the input object, if the desired prototype is an object", function() {
          if(O.setPrototypeOf) {
            expect(O.setPrototypeOf(parrot, protoEggs)).toBe(parrot);
          } else {
            pending("Not supported in this environment");
          }
        });

      });
    });
  });

  describe("squire injection in an `it` block with no mock: pentaho.util.object - ", function() {
    var Spam, protoEggs, parrot;

    beforeEach(function() {
      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();
    });

    it("should return the input object, if the desired prototype is an object", function(done) {
      var injector = new Squire();
      injector.require(["pentaho/util/object"], function(O) {
        expect(O.setPrototypeOf(parrot, protoEggs)).toBe(parrot);
        done();
      });
    });

  });

  describe("squire injection in an `it` block with a mock: pentaho.util.object - ", function() {

    var Spam, protoEggs, parrot;
    beforeEach(function() {

      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();
    });

    it("should return the input object, if the desired prototype is an object", function(done) {
      var injector = new Squire();
      injector
        .mock({
          "pentaho/shim/env": {
            _label: "setProtoProp",
            has: {
              "Object.setPrototypeOf": false,
              "Object.prototype.__proto__": true
            }
          }
        })
        .require(["pentaho/util/object"], function(O) {
          if(O.setPrototypeOf) {
            var result = O.setPrototypeOf(parrot, protoEggs);
            expect(result).toBe(parrot);
          }
          done();
        });
    });

  });

  describe("squire injection in a looped `it` block with mocks: pentaho.util.object - ", function() {

    var Spam, protoEggs, parrot;
    beforeEach(function() {

      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();
    });


    [{
      _label: "setProtoProp",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "ES5",
      has: {
        "Object.setPrototypeOf": true,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "setProtoCopy",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": false
      }
    }].forEach(function(conf) {

      it("should return the input object, if the desired prototype is an object - " + conf._label + " implementation", function(done) {
        var injector = new Squire();
        injector
          .mock({
            "pentaho/shim/env": conf
          })
          .require(["pentaho/util/object"], function(O) {
            if(O.setPrototypeOf) {
              var result = O.setPrototypeOf(parrot, protoEggs);
              expect(result).toBe(parrot);
            }
            done();
          });
      });

    });
  });

  describe("squire injection in a looped `it` block with mocks: pentaho.util.object - sugary variant", function() {

    var Spam, protoEggs, parrot;
    beforeEach(function() {

      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();
    });


    [{
      _label: "setProtoProp",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "ES5",
      has: {
        "Object.setPrototypeOf": true,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "setProtoCopy",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": false
      }
    }].forEach(function(conf) {
      var injector = new Squire();
      injector
        .mock({
          "pentaho/shim/env": conf
        });

      it("should return the input object, if the desired prototype is an object - " + conf._label + " implementation",
        injector.run(["pentaho/util/object"], function(O) {
            if(O.setPrototypeOf) {
              var result = O.setPrototypeOf(parrot, protoEggs);
              expect(result).toBe(parrot);
            }
          })
      );

    });
  });


}); // pentaho.util.object
