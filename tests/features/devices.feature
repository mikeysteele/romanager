Feature: Companion Devices Management

  As a user
  I want to manage companion handheld and console devices
  So that I can sync ROMs and save states across my gaming hardware

  Scenario: Empty state shows enrollment callout
    Given there are no companion devices enrolled
    When I navigate to the "/settings/devices" page
    Then I should see "No Devices Enrolled"
    And I should see the "+ Add Device" button

  Scenario: Enrolling a new Batocera device
    Given there are no companion devices enrolled
    When I navigate to the "/settings/devices" page
    And I click the "+ Add Device" button
    And I enter "Living Room Batocera" as the device name
    And I select "batocera" as the frontend preset
    And I enter "64" as the storage budget limit
    And I submit the device creation form
    Then I should see the enrollment command containing "romanager-sync init"
    When I close the enrollment dialog
    Then the device "Living Room Batocera" should appear in the devices list
    And the device should have the "batocera" badge

  Scenario: Editing device sync profile and rules
    Given an enrolled device "Anbernic RG35XX" with preset "esde"
    When I navigate to the "/settings/devices" page
    And I click "Edit Profile" on the "Anbernic RG35XX" device
    And I add a sync rule with kind "include_system" and target "gba"
    And I save the device profile
    Then the edit profile dialog should close
