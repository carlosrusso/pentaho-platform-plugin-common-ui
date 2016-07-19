define([
  "pentaho/visual/base/View",
  "pentaho/visual/base",
  "pentaho/type/Context",
  "pentaho/type/events/DidChange",
  "tests/pentaho/util/errorMatch"
], function(View, modelFactory, Context, DidChange, errorMatch) {
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

      it("should be valid if the model is valid", function(){
        var view = new View(model);
        expect(model.validate()).toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(true);
      });

      it("should be invalid if the model is invalid", function(){
        var model = new Model();
        var view = new View(model);
        expect(model.validate()).not.toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(false);
      });
    });

    describe("#update", function() {
      var view;

      var DerivedView = View.extend({
        _update: function(){ return "Rendered"; }
      });

      var ValidationErrorView = DerivedView.extend({
        _validate: function(){ return ["Some error"]; }
      });

      var UpdateErrorView = View.extend({
        _update: function(){ throw new Error("Some error"); }
      });

      beforeEach(function() {
        listeners = jasmine.createSpyObj('listeners', [
          'didCreate',
          'willUpdate',
          'didUpdate',
          'rejectedUpdate'
        ]);

        model.on("will:update", listeners.willUpdate);
        model.on("did:update", listeners.didUpdate);
        model.on("rejected:update", listeners.rejectedUpdate);

        model.on("did:create", listeners.didCreate);
      });

      function expectValidationError(errorMessage, expectedMessage) {
        expect("View update was rejected:\n - " + expectedMessage).toBe(errorMessage);
      }

      it("should call the `will:update` event listener if the view is valid", function(done) {
        view = new DerivedView(model);

        view.update().then(function resolved() {
          expect(listeners.willUpdate).toHaveBeenCalled();
          done();
        }, function rejected() {
          done.fail();
        });
      });

      it("should call the `did:update` event listener if the view is valid and called `_update",
        function(done) {
          view = new DerivedView(model);
          spyOn(view, '_update').and.callThrough();

          view.update().then(function resolved() {
            expect(view._update).toHaveBeenCalled();
            expect(listeners.didUpdate).toHaveBeenCalled();
            done();
          }, function rejected() {
            done.fail();
          });
        });

      it("should call the `will:update` event listener if the view is invalid", function(done) {
        view = new ValidationErrorView(model);

        view.update().then(function resolved() {
          done.fail();
        }, function rejected() {
          expect(listeners.willUpdate).toHaveBeenCalled();
          done();
        });
      });

      it("should call the `rejected:update` event listener if the view `will:update` event is canceled",
        function(done) {
          view = new DerivedView(model);
          listeners.willUpdate.and.callFake(function(event) { event.cancel("I was canceled"); });

          view.update().then(function resolved() {
            done.fail();
          }, function rejected(reason) {
            expect(reason.message).toBe("I was canceled");
            expect(listeners.rejectedUpdate).toHaveBeenCalled();
            done();
          });
        });

      it("should call the `rejected:update` event listener if the view is invalid", function(done) {
        view = new ValidationErrorView(model);

        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expectValidationError(reason.message, "Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
          done();
        });
      });

      it("should call the `rejected:update` event listener if `_update` throws", function(done) {
        view = new UpdateErrorView(model);

        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expect(reason.message).toBe("Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
          done();
        });
      });

      it("should invoke `_update` if the view is valid", function(done) {
        view = new DerivedView(model);

        spyOn(view, '_update').and.callThrough();

        view.update().then(function resolved() {
          expect(view._update).toHaveBeenCalled();
          done();
        }, function rejected() {
          done.fail();
        });
      });

      it("should create the visualization DOM element if the view is valid", function(done) {
        view = new DerivedView(model);
        spyOn(view, 'prepare').and.callThrough();

        expect(view._element).toBeNull();
        view.update().then(function resolved() {
          expect(view.prepare).toHaveBeenCalled();
          expect(view._element instanceof HTMLElement).toBe(true);
          done();

        }, function rejected() { done.fail(); });

      });

      it("should create the visualization DOM element on the first update", function(done) {
        view = new DerivedView(model);
        spyOn(view, 'prepare').and.callThrough();

        view.update().then(function resolved() {
          view.update().then(function resolved() {
            expect(view.prepare.calls.count()).toBe(1);
            expect(view._element instanceof HTMLElement).toBe(true);
            done();

          }, function rejected() { done.fail(); });
        }, function rejected() { done.fail(); });

      });

      it("should emit a 'did:create' event after the first update", function(done) {
        view = new DerivedView(model);
        var emitted = false;

        listeners.didCreate.and.callFake(function() {
          emitted = true;
        });

        view.update().then(function resolved() {
          expect(emitted).toBe(true);
          done();
        }, function rejected() { done.fail(); });

      });

      it("should not invoke `_update` if the view is invalid", function(done) {
        view = new ValidationErrorView(model);
        spyOn(view, '_update').and.callThrough();

        view.update().then(function() {
          done.fail();
        }, function(reason) {
          expectValidationError(reason.message, "Some error");
          expect(view._update).not.toHaveBeenCalled();
          done();
        });

      });

      it("should not create the visualization DOM element if the view is invalid", function(done) {
        view = new ValidationErrorView(model);
        spyOn(view, 'prepare').and.callThrough();

        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expectValidationError(reason.message, "Some error");
          expect(view.prepare).not.toHaveBeenCalled();
          expect(view._element).toBeNull();
          done();
        });

      });

      it("should not invoke `_update` if `_validate` throws", function(done) {
        view = new ValidationErrorView(model);
        spyOn(view, '_update').and.callThrough();

        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expectValidationError(reason.message, "Some error");
          expect(view._update).not.toHaveBeenCalled();
          done();
        });

      });

      it("should not create the visualization DOM element if `_validate` throws", function(done) {
        view = new ValidationErrorView(model);
        spyOn(view, 'prepare').and.callThrough();

        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expectValidationError(reason.message, "Some error");
          expect(view.prepare).not.toHaveBeenCalled();
          done();
        });

      });

      it("should not emit a 'did:create' event if the view is invalid", function(done) {
        view = new ValidationErrorView(model);

        listeners.didCreate.and.callFake(function() {
          done.fail();
        });

        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expectValidationError(reason.message, "Some error");
          done();
        });

      });

      it("should not emit a 'did:create' event if `_validate` throws", function(done) {
        view = new ValidationErrorView(model);

        listeners.didCreate.and.callFake(function() {
          done.fail();
        });

        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expectValidationError(reason.message, "Some error");
          done();
        });

      });
    });

    describe("#_onChange", function(){
      var view, _resize, _update, _selectionChanged;
      beforeEach(function(){
        view = new View(model);
        _resize = spyOn(view, "_resize");
        _selectionChanged = spyOn(view, "_selectionChanged");
        _update = spyOn(view, "_update");
      });

      it("triggers #_resize when only 'height' changes", function(){
        model.height = 100;

        expect(_resize).toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("triggers #_resize when only 'width' changes", function(){
        model.width = 100;

        expect(_resize).toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("triggers #_selectionChanged when 'selectionFilter' changes", function(){
        model.selectionFilter = null;

        expect(_resize).not.toHaveBeenCalled();
        expect(_selectionChanged).toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("does not trigger any render method when 'selectionMode' changes", function(){
        model.selectionMode = null;

        expect(_resize).not.toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("triggers #_update when a property other than 'height', 'width' or 'selectionFilter' changes", function(){
        model.isInteractive = false;

        expect(_resize).not.toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).toHaveBeenCalled();
      });

    }); // #_onChange
  });

});
