Feature: Game Detail and Emulator

  As a user
  I want to view game metadata and launch games in the browser emulator
  So that I can preview and play my ROM collection

  Scenario: Viewing game details and ROM files
    Given the game "Super Mario World" with slug "super-mario-world" exists with a ROM "Super Mario World (USA).sfc"
    When I navigate to the "/game/super-mario-world" page
    Then I should see "Super Mario World" as the game title
    And I should see "(1990)" as the release year
    And I should see "94" as the game rating
    And I should see the ROM file "Super Mario World (USA).sfc" in the files table
    And I should see a "Play / Open" button for the ROM

  Scenario: Launching browser emulator from game detail
    Given the game "Super Mario World" with slug "super-mario-world" exists with a ROM "Super Mario World (USA).sfc"
    When I navigate to the "/game/super-mario-world" page
    And I click the "Play / Open" button for the ROM
    Then I should be on the play page for the ROM
    And the emulator player should be displayed with "Super Mario World (USA).sfc"
