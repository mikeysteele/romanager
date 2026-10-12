Feature: Settings and Storage

  As a user
  I want to configure storage paths and file type whitelists
  So that scanning operates accurately

  Scenario: Navigating from settings hub to ROM management
    When I navigate to the "/settings" page
    Then I should see the settings hub cards
    When I click the "ROM Management" card
    Then I should be on the "/settings/rom-management" page

  Scenario: Updating ROMs storage directory
    Given the current ROMs directory is "/mnt/emulation/roms"
    When I navigate to the "/settings/rom-management" page
    And I enter "/mnt/retro/roms" as the ROMs directory
    And I click the "Save & Scan" button
    Then the ROMs directory input should have value "/mnt/retro/roms"

  Scenario: Viewing file types whitelist
    Given the whitelist includes extensions ".sfc" and ".nes"
    When I navigate to the "/settings/file-types" page
    Then I should see ".sfc" in the file types list
    And I should see ".nes" in the file types list
