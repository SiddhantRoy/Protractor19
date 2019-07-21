describe("This is test2 test", function() {
	
	it("This app will add 2 number", function() {
		
		browser.get("http://juliemr.github.io/protractor-demo/");
		element(by.model("first")).sendKeys("3");
		element(by.model("second")).sendKeys("5");
		
		element(by.id("gobutton")).click();
		
		//assertion
		expect(element(by.className("ng-binding")).getText()).toEqual("8");
		
		
	})
	
})