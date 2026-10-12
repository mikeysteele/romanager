Feature: Platforms and Firmware Management

  As a user
  I want to manage emulation platforms and their required BIOS files
  So that my ROMs are associated with proper emulators and firmware

  Scenario: Viewing platforms list with ROM status
    Given the following platforms exist:
      | name             | slug | romCount |
      | Super Nintendo   | snes | 0        |
      | Sony PlayStation | psx  | 15       |
    When I navigate to the "/settings/platforms" page
    Then I should see "Super Nintendo" in the platforms list
    And the "Super Nintendo" platform should have a "0 ROMs" badge
    And the "Super Nintendo" platform should have a "Remove Platform" button
    And the "Sony PlayStation" platform should have a "15 ROMs" badge
    And the "Sony PlayStation" platform should not have a "Remove Platform" button

  Scenario: Adding a new platform
    Given the following platforms exist:
      | name            | slug | romCount |
      | Super Nintendo  | snes | 5        |
    When I navigate to the "/settings/platforms" page
    And I click the "Add Platform" button in the page header
    And I enter "Game Boy Advance" as the new platform name
    And I enter "gba" as the new platform core path
    And I submit the add platform form
    Then I should see "Game Boy Advance" in the platforms list
    And the "Game Boy Advance" platform should have a "0 ROMs" badge

  Scenario: Removing an empty platform
    Given the following platforms exist:
      | name            | slug | romCount |
      | Neo Geo Pocket  | ngp  | 0        |
    When I navigate to the "/settings/platforms" page
    And I click "Remove Platform" on the "Neo Geo Pocket" platform
    Then "Neo Geo Pocket" should not be in the platforms list
