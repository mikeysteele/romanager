Feature: File Importing

  As a user
  I want to scan my ROM library
  So that I can organize and play my games

  Scenario: Recursive folder scan
    Given I have a folder structure:
      | path |
      | /roms/snes/mario.sfc |
      | /roms/gba/pokemon.gba |
    When I scan the "/roms" directory
    Then I should find 2 games
    And the game "mario.sfc" should be found
    And the game "pokemon.gba" should be found

  Scenario: Auto-mapping based on folder name
    Given I have a file located at "/roms/snes/mario.sfc"
  Scenario: Scan triggers library update
    Given I am on the settings page
    When I set the ROMs directory to "/tmp/roms"
    And I click the "Save & Scan" button
    Then I should see a "Settings saved" alert
    # We can't easily wait for background process in UI test without polling or SSE
    # But we can verify the backend state or just wait a bit
    And I wait for the "roms-updated" event
    Then I should be on the library page
    And I should see "SNES" in the systems list
