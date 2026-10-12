Feature: Navigation and Search

  As a user
  I want to navigate through the Romanager interface
  So that I can search for games, review unmapped files, and browse library

  Scenario: Sidebar links navigate between main sections
    When I navigate to the "/" page
    Then I should see the sidebar
    When I click the "Add New" link in the sidebar
    Then I should be on the "/add" page
    When I click the "Unmapped" link in the sidebar
    Then I should be on the "/unmapped" page

  Scenario: Searching and adding a new game
    Given the metadata search returns a game "Test Game" with slug "test-game"
    When I navigate to the "/add" page
    And I search for "Test Game" in the add game search bar
    Then I should see the game card for "Test Game"
    When I click on the game card for "Test Game"
    And I click "Add Game" in the dialog
    Then I should see "Game Added Successfully"

  Scenario: Viewing unmapped files queue
    Given there is an unmapped file "rom.iso" of size 10485760
    When I navigate to the "/unmapped" page
    Then I should see "rom.iso" in the unmapped files table
