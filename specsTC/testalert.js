describe("Alert", function() {
	
	browser.ignoreSynchronization=true
	it('Alert Test webelement', function())
	{
		browser.get('https://chercher.tech/practice/practice-pop-ups-selenium-webdriver');
		element(by.name("alert")).click();
		
		Handlealerts.acce
		browser.switchTo().alert().accept();
		//browser.switchTo().alert().getText().then(function(alertText) {
			console.log(alertText)
		
		})
	
})