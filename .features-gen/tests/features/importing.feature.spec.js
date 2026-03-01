// Generated from: tests/features/importing.feature
import { test } from "playwright-bdd";

test.describe('File Importing', () => {

  test('Recursive folder scan', async ({ Given, When, Then, And, request }) => { 
    await Given('I have a folder structure:', {"dataTable":{"rows":[{"cells":[{"value":"path"}]},{"cells":[{"value":"/roms/snes/mario.sfc"}]},{"cells":[{"value":"/roms/gba/pokemon.gba"}]}]}}); 
    await When('I scan the "/roms" directory', null, { request }); 
    await Then('I should find 2 games', null, { request }); 
    await And('the game "mario.sfc" should be found', null, { request }); 
    await And('the game "pokemon.gba" should be found', null, { request }); 
  });

  test('Auto-mapping based on folder name', async ({ Given }) => { 
    await Given('I have a file located at "/roms/snes/mario.sfc"'); 
  });

  test('Scan triggers library update', async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the settings page', null, { page }); 
    await When('I set the ROMs directory to "/tmp/roms"', null, { page }); 
    await And('I click the "Save & Scan" button', null, { page }); 
    await Then('I should see a "Settings saved" alert'); 
    await And('I wait for the "roms-updated" event', null, { page }); 
    await Then('I should be on the library page', null, { page }); 
    await And('I should see "SNES" in the systems list', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/features/importing.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I have a folder structure:","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When I scan the \"/roms\" directory","stepMatchArguments":[{"group":{"start":11,"value":"\"/roms\"","children":[{"start":12,"value":"/roms","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I should find 2 games","stepMatchArguments":[{"group":{"start":14,"value":"2","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":10,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"And the game \"mario.sfc\" should be found","stepMatchArguments":[{"group":{"start":9,"value":"\"mario.sfc\"","children":[{"start":10,"value":"mario.sfc","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"And the game \"pokemon.gba\" should be found","stepMatchArguments":[{"group":{"start":9,"value":"\"pokemon.gba\"","children":[{"start":10,"value":"pokemon.gba","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":14,"pickleLine":17,"tags":[],"steps":[{"pwStepLine":15,"gherkinStepLine":18,"keywordType":"Context","textWithKeyword":"Given I have a file located at \"/roms/snes/mario.sfc\"","stepMatchArguments":[{"group":{"start":25,"value":"\"/roms/snes/mario.sfc\"","children":[{"start":26,"value":"/roms/snes/mario.sfc","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":18,"pickleLine":19,"tags":[],"steps":[{"pwStepLine":19,"gherkinStepLine":20,"keywordType":"Context","textWithKeyword":"Given I am on the settings page","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":21,"keywordType":"Action","textWithKeyword":"When I set the ROMs directory to \"/tmp/roms\"","stepMatchArguments":[{"group":{"start":28,"value":"\"/tmp/roms\"","children":[{"start":29,"value":"/tmp/roms","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":22,"keywordType":"Action","textWithKeyword":"And I click the \"Save & Scan\" button","stepMatchArguments":[{"group":{"start":12,"value":"\"Save & Scan\"","children":[{"start":13,"value":"Save & Scan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":23,"keywordType":"Outcome","textWithKeyword":"Then I should see a \"Settings saved\" alert","stepMatchArguments":[{"group":{"start":15,"value":"\"Settings saved\"","children":[{"start":16,"value":"Settings saved","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":23,"gherkinStepLine":26,"keywordType":"Outcome","textWithKeyword":"And I wait for the \"roms-updated\" event","stepMatchArguments":[{"group":{"start":15,"value":"\"roms-updated\"","children":[{"start":16,"value":"roms-updated","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":24,"gherkinStepLine":27,"keywordType":"Outcome","textWithKeyword":"Then I should be on the library page","stepMatchArguments":[]},{"pwStepLine":25,"gherkinStepLine":28,"keywordType":"Outcome","textWithKeyword":"And I should see \"SNES\" in the systems list","stepMatchArguments":[{"group":{"start":13,"value":"\"SNES\"","children":[{"start":14,"value":"SNES","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end