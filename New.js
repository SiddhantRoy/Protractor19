//page commands Pract

//const pro=require("protractor");

//describe block = user story
describe("This is new test", function() {
	
	//it block = testcase
	it("Test Angularjs app", function() {
		
		browser.get("https://angularjs.org/");
		console.log(browser.getCurrentUrl());
//1.getcurrenturl
		browser.getCurrentUrl().then(function(title) {
			console.log("The url is :" +title)	
		});

//2.getpagesource
		browser.getPageSource().then(function(pagesrc) {
			console.log("The pagesouce is" +pagesrc)
		});
	
		console.log("test ended");
		//expect(1).toBe(1);	
	
	})
	
})