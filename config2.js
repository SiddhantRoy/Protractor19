var HtmlReporter = require('protractor-beautiful-reporter');
 
exports.config = {
   // your config here ...
		seleniumAddress: 'http://localhost:4444/wd/hub',
		  specs: ['\\Protracter19\\specsTC\\testalert.js'],
		  
 //Test in  multipule browser
		  multiCapabilities: [{
			  'browserName' : 'firefox'
		  }, {
			  'browserName' : 'chrome'
		  
		  }],
		  
//for screen shot		  
   onPrepare: function() {
	   
      // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
      jasmine.getEnv().addReporter(new HtmlReporter({
         baseDirectory: 'Report/screenshots'
      }).getJasmine2Reporter());
   }
}