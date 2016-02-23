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
  "pentaho/data/Filter",
  "pentaho/data/Element",
  "pentaho/data/Table"
], function(Filter, Element, Table) {
  "use strict";

  describe("pentaho.data.Filter.Or", function() {

    var data;
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
    });


    it("should be of type '$or' ", function() {
      var filter = new Filter.Or();
      expect(filter.type).toBe("$or");
    });

    it("should be commutative", function() {
      var sales12k = new Filter.IsIn("sales", [12000]);
      var inStock = new Filter.IsEqual("inStock", true);
      var combination1 = new Filter.Or([sales12k, inStock]);
      var data1 = combination1.filter(data);

      var combination2 = new Filter.Or([inStock, sales12k]);
      var data2 = combination2.filter(data);

      expect(data1.getNumberOfRows()).toBe(3);
      expect(data1.getNumberOfRows()).toBe(data2.getNumberOfRows());
      expect(data1.getValue(0, 0)).toBe(data2.getValue(0, 0));
    });

    it("should perform an OR.", function() {
      var sales12k = new Filter.IsIn("sales", [12000]);
      var inStock = new Filter.IsEqual("inStock", true);

      var combination = new Filter.Or([sales12k, inStock]);
      var filteredData = combination.filter(data);

      expect(filteredData.getNumberOfRows()).toBe(3);
      expect(filteredData.getValue(0, 0)).toBe("A");
      expect(filteredData.getValue(1, 0)).toBe("B");
      expect(filteredData.getValue(2, 0)).toBe("C");
    });

    describe("#toSpec", function() {
      it("should return a JSON.", function() {
        var sales12k = new Filter.IsIn("sales", [12000]);
        var inStock = new Filter.IsEqual("inStock", true);

        var combination = new Filter.Or([sales12k, inStock]);
        expect(combination.toSpec()).toEqual({
          "$or": [
            {"sales": {"$in": [12000]}},
            {"inStock": {"$eq": true}}
          ]
        });
      });

      it("should return `null` if it has no operands.", function() {
        var combination = new Filter.Or();
        expect(combination.toSpec()).toBeNull();
      });
    });

    describe("#contains", function() {

      var sales12k, inStock;
      beforeEach(function() {
        sales12k = new Filter.IsIn("sales", [12000]);
        inStock = new Filter.IsEqual("inStock", true);
      });

      it("should return `true` if a given `element` belongs to the dataset.", function() {
        var filter = new Filter.Or([sales12k, inStock]);
        var element = new Element(data, 0);
        expect(filter.contains(element)).toBe(true);
      });

      it("should return `false` if a given `element` does not belong to the dataset.", function() {
        var filter = new Filter.Or([sales12k, inStock]);
        var element = new Element(data, 3);
        expect(filter.contains(element)).toBe(false);
      });

      it("should return `false` if the filter has no operands.", function() {
        var filter = new Filter.Or();
        var element = new Element(data, 0);
        expect(filter.contains(element)).toBe(false);
      });

    }); // #contains

    describe("#union", function() {
      it("should add elements instead of creating ORs of ORs", function() {
        var sales12k = new Filter.IsIn("sales", [12000]);
        var inStock = new Filter.IsEqual("inStock", true);
        var combined1 = new Filter.Or([sales12k, inStock]);
        var productA = new Filter.IsEqual("product", "A");

        var union = combined1.union(productA);

        expect(union).toBe(combined1);
        expect(union.children.length).toBe(3);
      });
    });

    describe("#negation", function() {
      it("should prevent double negation", function() {
        var sales12k = new Filter.IsIn("sales", [12000]);

        var notSales12k = sales12k.negation();
        expect(notSales12k.type).toBe("$not");
        expect(notSales12k.children.length).toBe(1);
        expect(notSales12k.children[0].type).toBe("$in");

        var notNotSales12k = notSales12k.negation();
        expect(notNotSales12k.type).toBe("$in");
        expect(notNotSales12k).toBe(sales12k);
      });

      it("should return a simplified filter, with the negated terms next to the leafs", function() {
        var sales12k = new Filter.IsIn("sales", [12000]);
        var inStock = new Filter.IsEqual("inStock", true);
        var filter0 = new Filter.Or([sales12k, inStock]);

        var filter = filter0.negation();

        expect(filter.type).toBe("$and");
        expect(filter.children.length).toBe(2);
        expect(filter.children[0].type).toBe("$not");
        expect(filter.children[0].children.length).toBe(1);
        expect(filter.children[0].children[0].type).toBe("$in");
        expect(filter.children[1].type).toBe("$not");
        expect(filter.children[1].children.length).toBe(1);
        expect(filter.children[1].children[0].type).toBe("$eq");
      });
    });

  });
});