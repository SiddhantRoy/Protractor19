describe("This is new test", function() {
	
	//it block = testcase
	it("Test Angularjs app", function() {
		
		browser.get("https://angularjs.org/");
		
		
	/*1.size of window
		browser.manage().window().getSize().then(function (size) {
			
			console.log(size)
			console.log("h : "+size.height)
			console.log("w : "+size.width)
		})
		
	/*2.maximize
		browser.manage().window().maximize();
		
        browser.manage().window().getSize().then(function (size) {
			
			console.log(size)
			console.log("After h : "+size.height)
			console.log(" After w : "+size.width)
		})*/
	//3.getposition for co-ordinate
		
		browser.manage().window().getPosition().then(function (pos) {
			
			console.log(size)
			console.log("x : "+pos.x)
			console.log("y : "+pos.y)
		})
		
	//4.setPosition
		browser.manage().window().setPosition(100, 100);
        browser.manage().window().getPosition().then(function (pos) {
			
			console.log(size)
			console.log("After x : "+pos.x)
			console.log("After y : "+pos.y)
		})
		
	browser.sleep(5000)	
});
	
});