describe("This is new test", function() {
	
	//it block = testcase
	it("Test Angularjs app", function() {
		
		browser.get("https://angularjs.org/");
		
		browser.navigate().to("https://yahoo.com/")
		browser.sleep(5000)
		browser.navigate().back()
		browser.sleep(5000)
		browser.navigate().forward()
		
});
	
});