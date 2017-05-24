// ESA Filter Object.
// Sample methods of use:
// Gets all products.
// new FESA().s().e(function(products, count) {
// 	
// });
//
// Gets all products in collection "my-collection-handle", over 10$ and under 20$, paginated by 50, on page 4, sorted by vendor.
// new FESA().s().collection("my-collection-handle").price(">=", 10).price("<", 20).paginate(50).page(4).sort("vendor").e().done(function(products, count) {
// 	console.log(products.length);
// });
//
// All products in collection "my-collections-handle" NOT over 10$ and under 20$, all with the vendor "My Vendor".
// new FESA().s().collection("my-collection-handle").vendor("My Vendor").or(FESA.s().price("<", 10), FESA.s().price(">=", 20)).paginate(50).page(4).e(function(products, count) {
// 	
// });
//
// Gets the first 50 results of a search page, for mySearchString, performing a spelling correction if no results were found.,
// new FESA().s().searchByAll(mySearchString).autoCorrect(1).paginate(50).e(function(products, count, options) {
// 	
// });
//
// Uses JSONP to get the first 5 products in the store, sorted by the store owner's perefernece.
// new FESA().s().jsonp(1).sort("priority").paginate(5).e(function(products) {
// 	
// });
// 
// Set a default for all queries to be 48 products, and only show things that have the tag "Showing", and always sort by bestselling.
// var fesa = new FESA(); fesa.defaultQuery(fesa.s().paginate(48).tag("Showing").sort("bestselling"));
// fesa.s().page(4).e(function(products) {
//	
// });
// Filters based on options
// new FESA().option("color", "red").paginate(48).e(function(products) { 
// 
// }
// Sets an AB test up; directs a certain portion of traffic to the specified URL, based on randomness.
// If the server, for whatever reason stops responding, all traffic defaults to the new server.
// fesa.abTest([{ server: "54.235.68.81", probability: 0.01 }]);


var FESA = FESA || function(silenceErrors) {

	var filterObject = this;
	this._silenceErrors = silenceErrors || 0;
	this._defaultQuery = null;
	this.silenceErrors = function(silence) {
		this._silenceErrors = silence;
	};
	this.defaultQuery = function(query) {
		this._defaultQuery = this.clone(query);
	};
	
	this.clone = function(obj) {
		return new queryObject([], {}).merge(obj);
	};
	
	this.setCookie = function(cookieName, cookieValue, expDays) {
		var exdate=new Date();
		exdate.setDate(exdate.getDate() + expDays);
		var c_value=encodeURIComponent(cookieValue) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
		c_value += "; path=/";
		document.cookie=cookieName + "=" + c_value;
	};
	this.deleteCookie = function(cookieName) {
		document.cookie = cookieName + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	};
	this.getCookie = function(cookieName) {
		var c_value = document.cookie;
		var c_start = c_value.indexOf(" " + cookieName + "=");
		if (c_start == -1)
			c_start = c_value.indexOf(cookieName + "=");
		if (c_start == -1)
			c_value = null;
		else {
			c_start = c_value.indexOf("=", c_start) + 1;
			var c_end = c_value.indexOf(";", c_start);
			if (c_end == -1)
				c_end = c_value.length;
			c_value = decodeURIComponent(c_value.substring(c_start,c_end));
		}
		return c_value;
	}
	
	this.baseURL = "filters-balanced.eshopadmin.com/filter-fast-proxy";
	
	// Boiler-plate.
	this.ajax = function(url, options) {
		if (!options)
			options = {};
		if (!options['dataType'])
			options['dataType'] = 'json';
		if (!options['contentType'])
			options['contentType'] = 'json';
		if (options['data'] && options['contentType'] == 'json' && typeof(options.data) == "object" && options['type'] && options['type'] != "GET")
			options['data'] = JSON.stringify(options.data);
		options['url'] = url;
		return jQuery.ajax(options);
	};
	
	this.deferred = function() {
		return jQuery.Deferred();
	};
	
	this.map = function(items, func) {
		return jQuery.map(items, func);
	};
	
	
	// QUERY INTERFACE.
	function generateQualitativeQuery(field, operator, text) {
		if (!operator)
			operator = "==";
		var hash = {};
		hash[field] = { };
		hash[field][operator] = text;
		return new queryObject(hash);
	}
	function generateQuantitativeQuery(field, operator, text) {
		if (!operator)
			operator = "==";
		var hash = {};
		hash[field] = { };
		hash[field][operator] = text;
		return new queryObject(hash);
	}
	
	var queryObject = function(query, attributes) {
		if (query && typeof(query) == "object")
			query = [query];
		this.innerQuery = query || [];
		this.innerAttributes = attributes || {};
		this.innerJSONP = 0;
		this.innerHostname = null;
		
		this.merge = function(otherQuery) {
			if (otherQuery.innerQuery)
				this.innerQuery = this.innerQuery.concat(otherQuery.innerQuery);
			for (var i in otherQuery.innerAttributes) {
				if (this.innerAttributes[i] && !filterObject._silenceErrors)
					alert("Query is overwriting " + i + " during merge.");
				this.innerAttributes[i] = otherQuery.innerAttributes[i];
			}
			this.innerJSONP = this.innerJSONP || otherQuery.innerJSONP;
			this.innerHostname = this.innerHostname || otherQuery.innerHostname;
			return this;
		};
		
		var quantitativeFields = ["price", "grams", "compare_at_price", "inventory_quantity"];
		var qualitativeFields = ["title", "option1", "option2", "option3", "product_type", "vendor", "tag", "sku"];
		
		this.searchByTitle = function(text) {
			return this.merge(new queryObject({}, { search: { title: text }  }));
		};
		this.searchByTag = function(text) {
			return this.merge(new queryObject(null, { search: { tag: text }  }));
		};
		this.searchByAll = function(text) {
			return this.merge(new queryObject(null, { search: { any: text }  }));
		};
		this.searchByAny = this.searchByAll;
		this.search = this.searchByAll;
		this.collection = function(collection_handle) {
			return this.merge(new queryObject(null, { collection: collection_handle }));
		};
		
		this.isEmptyQuery = function() {
			return this.innerQuery.length == 0;
		};
		
		this.hostname = function(hostname) {
			this.innerHostname = hostname;
		}
		
		// operators are <, >, ==, !=, >=, <=, in
		for (var i = 0; i < quantitativeFields.length; ++i) {
			var closure = function(i) {
				return function(operator, amount) {
					if (!filterObject._silenceErrors && arguments.length < 2)
						alert("Requires an operator and operand.");
					return this.merge(generateQuantitativeQuery(quantitativeFields[i], operator, amount));
				};
			};
			this[quantitativeFields[i]] = closure(i);
		}
		// operators are  ==, !=, in, =~, ^, $, sub
		for (var i = 0; i < qualitativeFields.length; ++i) {
			var closure = function(i) {
				return function(operator, amount) {
					if (arguments.length == 1) {
						amount = operator;
						operator = "==";
					}
					return this.merge(generateQualitativeQuery(qualitativeFields[i], operator, amount));
				};
			}
			this[qualitativeFields[i]] = closure(i);
		}
		this.option = function(name, operator, operand) {
			var hash = {};
			hash[name] = {};
			if (arguments.length == 2) {
				operand = operator;
				operator = "==";
			}
			if (!operator)
				operator = "==";
			hash[name][operator] = operand;
			return this.merge(new queryObject({ option: hash }));
		};
		
		this.or = function() {
			if (arguments.length >= 1 && Object.prototype.toString.call(arguments[0]) != '[object Array]') {
				if (arguments.length > 1)
					return this.merge(new queryObject({ "or": filterObject.map(arguments, function (e) { return e.innerQuery; }) }));
				else
					return this.merge(arguments[0]);
			}
			else if (Object.prototype.toString.call(arguments[0]) == '[object Array]') {
				return this.or.apply(this, arguments[0]);
			}
			return this;
		};		
		this.and = function() {
			if (arguments.length >= 1) {
				if (arguments.length > 1)
					return this.merge(new queryObject({ "and": filterObject.map(arguments, function (e) { return e.innerQuery; }) }));
				else
					return this.merge(arguments[0]);
			}
			else if (Object.prototype.toString.call(arguments[0]) == '[object Array]')
				return this.and.apply(this, arguments[0]);
			return this;
		};
		this.sort = function(field) {
			return this.merge(new queryObject(null, { sort: field }));
		};
		this.count = function(field) {
			return this.merge(new queryObject(null, { count: field }));
		};
		
		this.paginate = function(pageAmount) {
			pageAmount = parseInt(pageAmount);
			if (pageAmount < 1 || pageAmount > 1000) 
				alert("Must be a number between 1 and 1000");
			return this.merge(new queryObject(null, { rows: pageAmount }));
		};
		this.jsonp = function(jsonp) {
			this.innerJSONP = jsonp;
			return this;
		}
		this.page = function(page) {
			return this.merge(new queryObject(null, { page: page }));
		};
		
		this.spellCheck = function(spellCheck) {
			return this.merge(new queryObject(null, { spellCheck: spellCheck }));
		};
		this.autoCorrect = function(autoCorrect) {
			return this.merge(new queryObject(null, { autoCorrect: autoCorrect }));
		};
		// Options can be passed like this ["product_type", "vendor", {"option":"Color"}, {"option":"Size"}, {"price": [10,20,30,40]}]
		// Likewise, you can also specify if you want the counts to ignore conditions on their counts.
		// I.E. If you have a product type condition, and are looking at product type, setting ignoreOptionConditions
		// to true will cause the system to ignore that condition while calculating the counts.
		// Price will go from 0-10, 10-20, 30-40, 40+
		this.options = function(options, ignoreOptionConditions) {
			var hash = { options: options };
			if (ignoreOptionConditions)
				hash['ignoreOptionConditions'] = true;
			return this.merge(new queryObject(null, hash));
		};
		
		// Can restrict fields in the following manner. ["id", "handle", "variants[handle]"]
		// Useful for reducing the amount of time spent downloading the search results, which can be quite a while.
		// Processing time will be longer, though.
		this.fields = function(fieldListing) {
			return this.merge(new queryObject(null, { fields: fieldListing }));
		}
		
		this.end = function(doneFunc) {
			var deferred = filterObject.deferred();
			if (doneFunc)
				deferred.done(doneFunc);
			var hash = {"q": JSON.stringify({ query: this.innerQuery, attributes: this.innerAttributes }) };
			if (this.innerHostname)
				hash["hostname"] = this.innerHostname;
			// Make this easier to flip over to POST.
			filterObject.ajax("//" + filterObject.baseURL, {
				type: "GET",
				dataType: (this.innerJSONP ? "jsonp" : "json"),
				contentType: "application/json",
				data: hash
			}).done(function(results) {
				if (results['collections'])
					deferred.resolve(results.collections, results.count, results);
				else
					deferred.resolve(results.products, results.count, results);
			}).fail(function() {
				if (!filterObject.backupProducts) {
					deferred.reject();
				} else {
					deferred.resolve(filterObject.backupProducts.products, filterObject.backupProducts.products.length);
				}
			});
			return deferred;
		};
		
		this.e = function(doneFunc) {
			return this.end(doneFunc);
		}
	};
	
	this.start = function() {
		if (this._defaultQuery)
			return this.clone(this._defaultQuery);
		return new queryObject();
	};
	this.s = function() {
		return this.start();
	};
	this.backupProducts = null;
	this.backup = function(products) {
		if (typeof(products) == "object") {
			backupProducts = products;
		} else {
			backupProducts = {"products":products};
		}
	}
	
	this.spellCheck = function(phrase) {
		var deferred = filterObject.deferred();
		filterObject.ajax("//" + filterObject.baseURL + "/spell-check", {
			type: "GET",
			dataType: "json",
			contentType: "json",
			data: { "phrase": phrase }
		}).done(function(result) {
			deferred.resolve(result.words, result.original, result.corrected);
		}).fail(function() {
			deferred.reject();
		});
	}
	
};
