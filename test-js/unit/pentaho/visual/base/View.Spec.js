define([
  "pentaho/visual/base/View",
  "pentaho/visual/base",
  "pentaho/type/Context",
  "pentaho/type/events/DidChange",
  "tests/test-utils",
  "tests/pentaho/util/errorMatch"
], function(View, modelFactory, Context, DidChange, testUtils, errorMatch) {

  "use strict";

  /*global document:false*/

  // Allow ~0
  // jshint -W016

  describe("pentaho.visual.base.View", function() {

    var Model, model;

    beforeEach(function() {

      var dataTableSpec = {
        model: [
          {name: "country", type: "string", label: "Country"},
          {name: "sales", type: "number", label: "Sales"}
        ],
        rows: [
          {c: [{v: "Portugal"}, {v: 12000}]},
          {c: [{v: "Ireland"}, {v: 6000}]}
        ]
      };

      var dataSpec = {
        width: 1,
        height: 1,
        data: {
          v: dataTableSpec
        }
      };

      var context = new Context();
      Model = context.get(modelFactory);
      model = new Model(dataSpec);

      // stress-test: have a change on the model take some time to complete
      // enable locally while developing tests
      /*
      model.on("will:change", function(){
        var t0 = new Date().valueOf();
        var waitPeriod = 1000; // in ms
        while(new Date().valueOf() < t0  + waitPeriod){};
      });
      */
    });

    describe("new (model)", function() {

      it("should throw if invoked with no arguments", function() {

        expect(function() {
          return new View();
        }).toThrow(errorMatch.argRequired("model"));

        expect(function() {
          return new View(model);
        }).not.toThrow();

      });
    });

    describe("validation", function() {

      it("should be valid if the model is valid", function() {
        var view = new View(model);

        expect(model.validate()).toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(true);
      });

      it("should be invalid if the model is invalid", function() {
        var model = new Model();
        var view = new View(model);

        expect(model.validate()).not.toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(false);
      });
    });

    describe("#update", function() {

      var it = testUtils.itAsync;

      var DerivedView = View.extend({
        _update: function() {
          this._setDomNode(document.createElement("div"));
          return "Rendered";
        }
      });

      var ValidationErrorView = DerivedView.extend({
        _validate: function() { return ["Some error"]; }
      });

      var UpdateErrorView = View.extend({
        _update: function() { throw new Error("Some error"); }
      });

      function createListeners() {
        return jasmine.createSpyObj('listeners', [
          'didCreate',
          'willUpdate',
          'didUpdate',
          'rejectedUpdate'
        ]);
      }

      function createView(ViewClass, listeners) {

        var view = new ViewClass(model);
        if(listeners) {
          view.on("will:update",     listeners.willUpdate);
          view.on("did:update",      listeners.didUpdate);
          view.on("rejected:update", listeners.rejectedUpdate);
          view.on("did:create",      listeners.didCreate);
        }

        return view;
      }

      function expectError(listeners, errorMessage, expectedMessage) {
        expect(listeners.didUpdate).not.toHaveBeenCalled();
        expect(expectedMessage).toBe(errorMessage);
      }

      function expectValidationError(listeners, errorMessage, expectedMessage) {
        expectError(listeners, "View model is invalid:\n - " + expectedMessage, errorMessage);
      }

      it("should call the `will:update` event listeners if the view is valid", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        return view.update().then(function() {
          expect(listeners.willUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `did:update` event listeners if the view is valid and `_update` was called", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        spyOn(view, '_update').and.callThrough();

        return view.update().then(function() {
          expect(view._update).toHaveBeenCalled();
          expect(listeners.didUpdate).toHaveBeenCalled();
        });
      });

      it("should not call the `will:update` event listener if the view is invalid", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
          expect(listeners.willUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if the view `will:update` event is canceled", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        listeners.willUpdate.and.callFake(function(event) {
          event.cancel("I was canceled");
        });

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectError(listeners, reason.message, "I was canceled");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if the view is invalid", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(listeners, reason.message, "Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if `_update` throws", function() {
        var listeners = createListeners();
        var view = createView(UpdateErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectError(listeners, reason.message, "Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should invoke `_update` if the view is valid", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        spyOn(view, '_update').and.callThrough();

        return view.update().then(function() {
          expect(view._update).toHaveBeenCalled();
        });
      });

      it("should reject the update if the first successful update does not set a DOM node", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        expect(view.domNode).toBe(null);

        spyOn(view, '_setDomNode');

        return view.update().then(function() {
          fail("Expected update to be rejected.");
        }, function(reason) {
          expect(reason instanceof Error).toBe(true);
        });
      });

      it("should emit a 'did:create' event before the first 'did:update'", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);
        
        listeners.didCreate.and.callFake(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        });

        listeners.didUpdate.and.callFake(function() {
          expect(listeners.didCreate).toHaveBeenCalled();
        });

        return view.update().then(function() {
          expect(listeners.didCreate).toHaveBeenCalled();
          expect(listeners.didUpdate).toHaveBeenCalled();
        });
      });

      it("should not create the visualization DOM element if the view is invalid", function() {

        var view = createView(ValidationErrorView);

        spyOn(view, '_setDomNode');

        return view.update().then(function() {
          fail("Expected update to have been rejected.");
        }, function(reason) {
          expect(view._setDomNode).not.toHaveBeenCalled();
        });
      });

      it("should not let the visualization's DOM element be set more than once", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        var element = document.createElement("div");
        view._setDomNode(element);

        expect(view.domNode).toBe(element);

        expect(function() {
          view._setDomNode(document.createElement("span"));
        }).toThrow(errorMatch.operInvalid());
      });

      it("should not emit a 'did:create' event if the view is invalid", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(listeners, reason.message, "Some error");
        });
      });

      it("should not emit a 'did:create' event if `_validate` throws", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(listeners, reason.message, "Some error");
        });
      });
    });

    describe("#update (handling of dirty bits)", function() {

      var it = testUtils.itAsync;

      function createView(model) {
        var view = new View(model);
        view._setDomNode(document.createElement("div"));

        view.isAutoUpdate = false;
        view._dirtyRegions.clear(); // view is clean

        // Ensure view is always valid
        spyOn(view, "_validate").and.returnValue(null);

        return view;
      }

      function createUpdateSpies(view) {
        return {
          updateSize:      spyOn(view, "_updateSize"),
          updateSelection: spyOn(view, "_updateSelection"),
          update:          spyOn(view, "_update")
        };
      }

      it("should call #_updateSize when the SIZE bit is set", function() {

        var view  = createView(model);
        var spies = createUpdateSpies(view);

        view._dirtyRegions.set(View.REGIONS.SIZE);

        return view.update().then(function() {
          expect(spies.updateSize).toHaveBeenCalled();
          expect(spies.updateSelection).not.toHaveBeenCalled();
          expect(spies.update).not.toHaveBeenCalled();
        });
      });

      it("should call #_updateSelection when the SELECTION bit is set", function() {

        var view = createView(model);
        var spies = createUpdateSpies(view);

        view._dirtyRegions.set(View.REGIONS.SELECTION);

        return view.update().then(function() {
          expect(spies.updateSize).not.toHaveBeenCalled();
          expect(spies.updateSelection).toHaveBeenCalled();
          expect(spies.update).not.toHaveBeenCalled();
        });
      });

      it("should call #_update when both the SIZE and SELECTION bits are set", function() {
        var view = createView(model);
        var spies = createUpdateSpies(view);

        view._dirtyRegions.set(View.REGIONS.SIZE | View.REGIONS.SELECTION);

        return view.update().then(function() {
          expect(spies.updateSize).not.toHaveBeenCalled();
          expect(spies.updateSelection).not.toHaveBeenCalled();
          expect(spies.update).toHaveBeenCalled();
        });
      });
    });

    describe("#_onModelChange", function(){
      var view;

      beforeEach(function() {

        view = new View(model);

        view.isAutoUpdate = false;
        view._dirtyRegions.clear();

        expect(view.isDirty).toBe(false); // view is clean
      });

      it("should set the SIZE bit when only 'height' changes", function() {
        model.height = 100;
        expect(view._dirtyRegions.is(View.REGIONS.SIZE)).toBe(true);
      });

      it("should set the SIZE bit when only 'width' changes", function() {
        model.width = 100;
        expect(view._dirtyRegions.is(View.REGIONS.SIZE)).toBe(true);
      });

      it("should set the SELECTION bit  when 'selectionFilter' changes", function() {
        model.selectionFilter = null;
        expect(view._dirtyRegions.is(View.REGIONS.SELECTION)).toBe(true);
      });

      it("should not set the view as dirty when 'selectionMode' changes", function() {
        model.selectionMode = null;
        expect(view.isDirty).toBe(false);
      });

      it("should set the view as completely dirty when a property other than " +
         "'height', 'width' or 'selectionFilter' changes", function() {
        model.isInteractive = false;
        expect(view._dirtyRegions.is(View.REGIONS.ALL)).toBe(true);
      });
    }); // #_onModelChange

    describe("#isAutoUpdate", function() {

      it("should be set to `true` by default", function() {
        var view = new View(model);

        expect(view.isAutoUpdate).toBe(true);
      });

      it("should be writable", function() {
        var view = new View(model);

        view.isAutoUpdate = false;
        expect(view.isAutoUpdate).toBe(false);
      });

      describe("controls if the View updates in reaction to changes", function() {

        function createView(model) {
          var view = new View(model);
          view._setDomNode(document.createElement("div"));

          view.isAutoUpdate = false;
          view._dirtyRegions.clear(); // view is clean

          // Ensure view is always valid
          spyOn(view, "_validate").and.returnValue(null);

          return view;
        }

        function createUpdateSpies(view) {
          return {
            updateSize:      spyOn(view, "_updateSize"),
            updateSelection: spyOn(view, "_updateSelection"),
            update:          spyOn(view, "_update")
          };
        }

        it("should not trigger any update method when 'isAutoUpdate' is set to `false`", function() {

          var view = createView(model);

          view.isAutoUpdate = false;

          var update = spyOn(view, "update");

          // trigger a set of changes
          model.selectionFilter = null;
          model.isInteractive = false;
          model.width = 100;

          expect(update).not.toHaveBeenCalled();
        });

        describe("should resume triggering update methods when 'isAutoUpdate' is set " +
                 "to `true` after being at `false`", function() {

          it("resumes running the #_updateSelection partial update", function(done) {
            var view  = createView(model);
            var spies = createUpdateSpies(view);

            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(spies.updateSelection).toHaveBeenCalled();
              done();
            });

            model.selectionFilter = null; // marks the view as dirty
          });

          it("resumes running the #_updateSize partial update", function(done) {
            var view  = createView(model);
            var spies = createUpdateSpies(view);

            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(spies.updateSize).toHaveBeenCalled();
              done();
            });

            model.width = 100; // marks the view as dirty
          });

          it("resumes running #_update (full update)", function(done) {
            var view  = createView(model);
            var spies = createUpdateSpies(view);

            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(spies.update).toHaveBeenCalled();
              done();
            });

            model.isInteractive = false;
          });
        });
      });
    }); // #isAutoUpdate

    describe("#isDirty", function() {

      var view;

      beforeEach(function() {

        var DerivedView = View.extend({
          _update: function() {},
          _validate: function() {
            return null;
          }
        });

        view = new DerivedView(model);
        view._setDomNode(document.createElement("div"));
      });

      it("should be `true` when the view is created", function() {
        expect(view.isDirty).toBe(true);
      });

      it("should be read-only", function() {
        expect(function() {
          view.isDirty = false;
        }).toThrowError(TypeError);
      });

      it("should be `false` after a full update", function(done) {

        expect(view.isDirty).toBe(true);

        view.update().then(function() {

          expect(view.isDirty).toBe(false);

          done();
        }, done.fail);
      });

      describe("plays along '#isAutoUpdate'", function() {

        beforeEach(function(done) {
          // Ensure a first render has occurred.
          // The view is thus clean (not dirty)
          view.update().then(done, done.fail);
        });

        it("should mark the view as dirty when 'isAutoUpdate' is set to `false` and a change has taken place",
        function(done) {
          view.isAutoUpdate = false;

          model.on("did:change", function() {
            expect(view.isDirty).toBe(true);
            done();
          });

          // trigger a set of changes that ought to call the render methods
          model.selectionFilter = null;
        });
      });
    }); // #isDirty
  });
});