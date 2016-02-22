/*!
 * Copyright 2010 - 2016 Pentaho Corporation.  All rights reserved.
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
  "pentaho/lang/Filter",
  "pentaho/data/Table",
  "pentaho/data/TableView"
], function(Filter, Table, TableView) {
  "use strict";

  describe("Filter", function() {

    var data, filter;
    beforeEach(function() {
      data = new Table({
        model: [
          {name: "product", type: "string", label: "Product"},
          {name: "sales", type: "number", label: "Sales"},
          {name: "inStock", type: "boolean", label: "In Stock"}
        ],
        rows: [
          {c: [{v: "A"}, {v: 12000}, {v: true}]},
          {c: [{v: "B"}, {v: 6000}, {v: true}]},
          {c: [{v: "C"}, {v: 12000}, {v: false}]},
          {c: [{v: "D"}, {v: 1000}, {v: false}]},
          {c: [{v: "E"}, {v: 2000}, {v: false}]},
          {c: [{v: "F"}, {v: 3000}, {v: false}]},
          {c: [{v: "G"}, {v: 4000}, {v: false}]}
        ]
      });

      filter = new Filter.Root();
    });

    describe("isEqual ", function() {

      it("should work ", function() {
        var isProductA = new Filter.IsEqual("product", "A");
        expect(isProductA.type).toBe("isEqual");

        var filteredData = isProductA.filter(data);
        expect(filteredData.getNumberOfRows()).toBe(1);
        expect(filteredData.getValue(0, 0)).toBe("A");
      });

      it("should work ", function() {
        var isProductA = Filter.isEqual("product", "A");
        expect(isProductA.type).toBe("isEqual");

        var filteredData = isProductA.filter(data);
        expect(filteredData.getNumberOfRows()).toBe(1);
        expect(filteredData.getValue(0, 0)).toBe("A");
      });

      it("should work ", function() {
        var isProductA = new Filter.IsEqual("sales", 12000);
        var filteredData = isProductA.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(2);
        expect(filteredData.getValue(0, 0)).toBe("A");
        expect(filteredData.getValue(1, 0)).toBe("C");
      });

      it("should work ", function() {
        var isProductA = Filter.isEqual("sales", 5000);
        var filteredData = isProductA.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(0);
      });

    });

    describe("isIn ", function() {

      it("should work ", function() {
        var isProductAC = new Filter.IsIn("product", ["A", "C"]);
        expect(isProductAC.type).toBe("isIn");
        var filteredData = isProductAC.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(2);
        expect(filteredData.getValue(0, 0)).toBe("A");
        expect(filteredData.getValue(1, 0)).toBe("C");
      });

      it("should work ", function() {
        var isProductAC = Filter.isIn("product", ["A", "C"]);
        expect(isProductAC.type).toBe("isIn");
        var filteredData = isProductAC.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(2);
        expect(filteredData.getValue(0, 0)).toBe("A");
        expect(filteredData.getValue(1, 0)).toBe("C");
      });

      it("should work ", function() {
        var isProductA = new Filter.IsIn("sales", [5000, 12000]);
        var filteredData = isProductA.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(2);
        expect(filteredData.getValue(0, 0)).toBe("A");
        expect(filteredData.getValue(1, 0)).toBe("C");
      });

      it("should work ", function() {
        var isProductA = Filter.isIn("sales", [5000, 7000]);
        var filteredData = isProductA.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(0);
      });

    });
    describe("intersection ", function() {

      it("should return the intersection of the filters with the data", function() {
        var sales12k = new Filter.IsEqual("sales", 12000);
        var inStock = new Filter.IsEqual("inStock", true);

        var combination = sales12k.intersection(inStock);
        var filteredData = combination.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(1);
        expect(filteredData.getValue(0, 0)).toBe("A");
      });

      it("should return the intersection of the filters with the data", function() {
        var sales12k = Filter.isEqual("sales", 12000);
        var inStock = Filter.isEqual("inStock", true);

        var combination = Filter.intersection(sales12k, inStock);
        var filteredData = combination.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(1);
        expect(filteredData.getValue(0, 0)).toBe("A");
      });

    });

    describe("union ", function() {

      it("should return the union of the filters with the data", function() {
        var sales12k = new Filter.IsEqual("sales", 12000);
        var inStock = new Filter.IsEqual("inStock", true);

        var combination = sales12k.union(inStock);
        var filteredData = combination.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(3);
        expect(filteredData.getValue(0, 0)).toBe("A");
        expect(filteredData.getValue(1, 0)).toBe("B");
        expect(filteredData.getValue(2, 0)).toBe("C");
      });

      it("should return the union of the filters with the data", function() {
        var sales12k = Filter.isEqual("sales", 12000);
        var inStock = Filter.isEqual("inStock", true);

        var combination = Filter.union(sales12k, inStock);
        var filteredData = combination.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(3);
        expect(filteredData.getValue(0, 0)).toBe("A");
        expect(filteredData.getValue(1, 0)).toBe("B");
        expect(filteredData.getValue(2, 0)).toBe("C");
      });

    });

    describe("negation ", function() {
      it("should return the negation of a simple filter", function() {
        var sales12k = new Filter.IsEqual("sales", 12000);

        var combination = sales12k.negation(sales12k);
        var filteredData = combination.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(5);
        [
          "B", "D", "E", "F", "G"
        ].forEach(function(product, idx) {
          expect(filteredData.getValue(idx, 0)).toBe(product);
        });

      });

      it("should return the negation of a simple filter", function() {
        var sales12k = Filter.negation(Filter.isEqual("sales", 12000));

        var filteredData = sales12k.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(5);
        [
          "B", "D", "E", "F", "G"
        ].forEach(function(product, idx) {
          expect(filteredData.getValue(idx, 0)).toBe(product);
        });

      });

      it("should return the negation of a complex filter", function() {
        var filter = new Filter.Or();
        expect(filter.type).toBe("or");
        expect(filter.predicate()).toBe(false);
        filter
            .insert(new Filter.IsEqual("product", "A"))
            .insert(new Filter.IsEqual("product", "B"))
            .insert(new Filter.IsEqual("product", "C"));

        var combination = filter.negation(filter);
        var filteredData = combination.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(4);
        [
          "D", "E", "F", "G"
        ].forEach(function(product, idx) {
          expect(filteredData.getValue(idx, 0)).toBe(product);
        });

      });

      it("should return the negation of a complex filter", function() {
        var filter = Filter.or();
        expect(filter.type).toBe("or");
        expect(filter.predicate()).toBe(false);
        filter
            .insert(Filter.isEqual("product", "A"))
            .insert(Filter.isEqual("product", "B"))
            .insert(Filter.isEqual("product", "C"));

        var combination = Filter.negation(filter);
        var filteredData = combination.filter(data);

        expect(filteredData.getNumberOfRows()).toBe(4);
        [
          "D", "E", "F", "G"
        ].forEach(function(product, idx) {
          expect(filteredData.getValue(idx, 0)).toBe(product);
        });

      });
    });

    describe("contains ", function() {

      it("should return the contains of a simple filter", function() {
        var productFilter = new Filter.IsIn("product", ["A", "B", "C", "D", "E", "F", "G"]);
        var filteredData = productFilter.filter(data);
        expect(productFilter.contains(data)).toBe(true);
      });

      it("should return the contains of a simple filter", function() {
        var productFilter = Filter.isIn("product", ["A", "B", "C", "D", "E", "F", "G"]);
        var filteredData = productFilter.filter(data);
        expect(productFilter.contains(data)).toBe(true);
      });

      it("should return the contains of a simple filter", function() {
        var productFilter = new Filter.IsIn("product", ["A", "B", "C", "D", "E", "F"]);
        var filteredData = productFilter.filter(data);
        expect(productFilter.contains(data)).toBe(false);
      });

      it("should return the contains of a simple filter", function() {
        var productFilter = Filter.isIn("product", ["A", "B", "C", "D", "E", "F"]);
        var filteredData = productFilter.filter(data);
        expect(productFilter.contains(data)).toBe(false);
      });

    });

    describe("AbstractTreeFilter ", function() {

      it("OrFilter ", function() {
        var filter = new Filter.Or();
        expect(filter.type).toBe("or");
        expect(filter.predicate()).toBe(false);
      });

      it("AndFilter ", function() {
        var filter = new Filter.And();
        expect(filter.type).toBe("and");
        expect(filter.predicate()).toBe(true);
      });

      it("NotFilter ", function() {
        var filter = new Filter.Not();
        expect(filter.type).toBe("not");
        //expect(filter.predicate()).toThrow("Poop");
      });

      it("RootFilter ", function() {
        var filter = new Filter.Root();
        expect(filter.type).toBe("or");
        expect(filter.predicate()).toBe(false);
      });

    });

  });
});