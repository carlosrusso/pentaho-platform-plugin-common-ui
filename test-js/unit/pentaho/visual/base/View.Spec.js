define([
  "pentaho/visual/base/View",
  "pentaho/visual/base",
  "pentaho/type/Context",
  "pentaho/type/events/DidChange",
  "tests/test-utils",
  "tests/pentaho/util/errorMatch"
], function(View, modelFactory, Context, DidChange,
            testUtils, errorMatch) {
  "use strict";

  /*global document:false*/

  describe("pentaho/visual/base/View", function() {
    var Model, model, listeners;

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
      false && model.on("will:change", function(){
        var t0 = new Date().valueOf();
        var waitPeriod = 1000; // in ms
        while(new Date().valueOf() < t0  + waitPeriod){};
      });

    });

    describe("the constructor ", function() {

      it("should throw if invoked with no arguments", function() {
        expect(function() {
          return new View();
        }).toThrow(errorMatch.argRequired("model"));

        expect(function() {
          return new View(model);
        }).not.toThrow();
      });

    });

    describe("validation: ", function() {

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
      var view, element = document.createElement("div");
      var it = testUtils.itAsync;

      var DerivedView = View.extend({
        _update: function() {
          this._setDomNode(element);
          return "Rendered";
        }
      });

      var ValidationErrorView = DerivedView.extend({
        _validate: function() { return ["Some error"]; }
      });

      var UpdateErrorView = View.extend({
        _update: function() { throw new Error("Some error"); }
      });

      beforeEach(function() {
        view = null;

        listeners = jasmine.createSpyObj('listeners', [
          'didCreate',
          'willUpdate',
          'didUpdate',
          'rejectedUpdate'
        ]);

      });

      function createView(ViewClass) {
        view = new ViewClass(model);

        view.on("will:update", listeners.willUpdate);
        view.on("did:update", listeners.didUpdate);
        view.on("rejected:update", listeners.rejectedUpdate);

        view.on("did:create", listeners.didCreate);
      }

      function expectError(errorMessage, expectedMessage) {
        expect(listeners.didUpdate).not.toHaveBeenCalled();
        expect(expectedMessage).toBe(errorMessage);
      }

      function expectValidationError(errorMessage, expectedMessage) {
        expectError("View update was rejected:\n - " + expectedMessage, errorMessage);
      }

      it("should call the `will:update` event listener if the view is valid", function() {
        createView(DerivedView);

        return view.update().then(function() {
          expect(listeners.willUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `did:update` event listener if the view is valid and called `_update", function() {
        createView(DerivedView);
        spyOn(view, '_update').and.callThrough();

        return view.update().then(function() {
          expect(view._update).toHaveBeenCalled();
          expect(listeners.didUpdate).toHaveBeenCalled();
        });
      });

      it("should not call the `will:update` event listener if the view is invalid", function() {
        createView(ValidationErrorView);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
          expect(listeners.willUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if the view `will:update` event is canceled", function() {
        createView(DerivedView);

        listeners.willUpdate.and.callFake(function(event) {
          event.cancel("I was canceled");
        });

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectError(reason.message, "I was canceled");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if the view is invalid", function() {
        createView(ValidationErrorView);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(reason.message, "Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if `_update` throws", function() {
        createView(UpdateErrorView);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectError(reason.message, "Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should invoke `_update` if the view is valid", function() {
        createView(DerivedView);

        spyOn(view, '_update').and.callThrough();

        return view.update().then(function() {
          expect(view._update).toHaveBeenCalled();
        });
      });

      it("should create the visualization DOM element if the view is valid", function() {
        createView(DerivedView);
        spyOn(view, '_setDomNode').and.callThrough();

        expect(view.domNode).toBeNull();
        return view.update().then(function() {
          expect(view._setDomNode).toHaveBeenCalled();
          expect(view.domNode instanceof HTMLElement).toBe(true);
        });

      });

      it("should emit a 'did:create' event before the first update", function() {
        createView(DerivedView);
        
        var created = false, updated = false;
        listeners.didCreate.and.callFake(function() {
          created = true;
          expect(updated).toBe(false);
        });

        listeners.didUpdate.and.callFake(function() {
          updated = true;
          expect(created).toBe(true);
        });

        return view.update().then(function() {
          expect(created).toBe(true);
          expect(updated).toBe(true);
        });

      });

      it("should not create the visualization DOM element if the view is invalid", function() {
        createView(ValidationErrorView);
        spyOn(view, '_setDomNode').and.callThrough();

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(reason.message, "Some error");
          expect(view._setDomNode).not.toHaveBeenCalled();
          expect(view.domNode).toBeNull();
        });

      });

      it("should not let the visualization's DOM element be set more than once", function() {
        createView(DerivedView);

        var element = document.createElement("div");
        view._setDomNode(element);
        expect(view.domNode).toBe(element);
        expect(function() {
          view._setDomNode(document.createElement("span"));
        }).toThrowError("Can't change the visualization dom node once it is set.");

      });

      it("should not emit a 'did:create' event if the view is invalid", function() {
        createView(ValidationErrorView);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(reason.message, "Some error");
        });

      });

      it("should not emit a 'did:create' event if `_validate` throws", function() {
        createView(ValidationErrorView);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(reason.message, "Some error");
        });

      });
    });

    describe("#update (handling of dirty bits)", function() {

      var view, _resize, _update, _selectionChanged;

      beforeEach(function() {

        view = new View(model);

        view.isAutoUpdate = false;
        view._dirtyState.clear(); // view is clean

        // Setup spies
        _resize = spyOn(view, "_resize");
        _selectionChanged = spyOn(view, "_selectionChanged");
        _update = spyOn(view, "_update");

        // Ensure view is always valid
        spyOn(view, "_validate").and.returnValue(null);
      });

      var it = testUtils.itAsync;

      it("should call #_resize when the RESIZE bit is set", function() {

        view._dirtyState.set(View.DIRTY.RESIZE);

        return view.update().then(function() {
          expect(_resize).toHaveBeenCalled();
          expect(_selectionChanged).not.toHaveBeenCalled();
          expect(_update).not.toHaveBeenCalled();
        });
      });

      it("should call #_selectionChanged when the SELECTION bit is set", function() {

        view._dirtyState.set(View.DIRTY.SELECTION);

        return view.update().then(function() {
          expect(_resize).not.toHaveBeenCalled();
          expect(_selectionChanged).toHaveBeenCalled();
          expect(_update).not.toHaveBeenCalled();
        });
      });

      it("should call #_update when both the RESIZE and SELECTION bits are set", function() {

        view._dirtyState.set(View.DIRTY.RESIZE | View.DIRTY.SELECTION);

        return view.update().then(function() {
          expect(_resize).not.toHaveBeenCalled();
          expect(_selectionChanged).not.toHaveBeenCalled();
          expect(_update).toHaveBeenCalled();
        });
      });
    });

    describe("#onChange", function(){
      var view, _update;

      beforeEach(function() {

        view = new View(model);

        view.isAutoUpdate = false;
        view._dirtyState.clear();
        expect(view.isDirty).toBe(false); // view is clean
      });

      it("should set the RESIZE bit when only 'height' changes", function() {
        model.height = 100;
        expect(view._dirtyState.is(View.DIRTY.RESIZE)).toBe(true);
      });

      it("should set the RESIZE bit when only 'width' changes", function() {
        model.width = 100;
        expect(view._dirtyState.is(View.DIRTY.RESIZE)).toBe(true);
      });

      it("should set the SELECTION bit  when 'selectionFilter' changes", function() {
        model.selectionFilter = null;
        expect(view._dirtyState.is(View.DIRTY.SELECTION)).toBe(true);
      });

      it("should not set the view as dirty when 'selectionMode' changes", function() {
        model.selectionMode = null;
        expect(view.isDirty).toBe(false);
      });

      it("should set the view as completely dirty when a property other than 'height', 'width' or 'selectionFilter' changes", function() {
        model.isInteractive = false;
        expect(view._dirtyState.is(View.DIRTY.FULL)).toBe(true);
      });

    }); // #_onChange


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
        var view, _resize, _update, _selectionChanged;

        beforeEach(function(done) {
          var DerivedView = View.extend({
            _update: function() {},
            _resize: function() {},
            _selectionChanged: function() {},
            _validate: function() { return null; }
          });

          view = new DerivedView(model);

          view.update().then(function() {

            // Setup spies after a clean update
            _resize = spyOn(view, "_resize");
            _selectionChanged = spyOn(view, "_selectionChanged");
            _update = spyOn(view, "_update");

            done();
          }, done.fail);

        });


        it("should not trigger any update method when 'isAutoUpdate' is set to `false`", function() {
          view.isAutoUpdate = false;
          var update = spyOn(view, "update");

          // trigger a set of changes
          model.selectionFilter = null;
          model.isInteractive = false;
          model.width = 100;

          expect(update).not.toHaveBeenCalled();

        });

        describe("should resume triggering update methods when 'isAutoUpdate' is set to `true` after being at `false`", function() {


          beforeEach(function() {
            view.isAutoUpdate = false;
          });

          it("resumes running the #_selectionChanged partial update", function(done) {
            expect(_selectionChanged).not.toHaveBeenCalled();
            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(_selectionChanged).toHaveBeenCalled();
              done();
            });

            model.selectionFilter = null; // marks the view as dirty
          });


          it("resumes running the #_resize partial update", function(done) {
            expect(_resize).not.toHaveBeenCalled();
            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(_resize).toHaveBeenCalled();
              done();
            });

            model.width = 100; // marks the view as dirty
          });

          it("resumes running #_update (full update)", function(done) {

            expect(_update).not.toHaveBeenCalled();
            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(_update).toHaveBeenCalled();
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

        it("should mark the view as dirty when 'isAutoUpdate' is set to `false` and a change has taken place", function(done) {
          view.isAutoUpdate = false;

          model.on("did:change", function(){
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
