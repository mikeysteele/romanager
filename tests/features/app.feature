Feature: Application Home

  As a user
  I want to view the Romanager home page
  So that I can see the ROM library

  Scenario: Home page loads with title and library
    When I navigate to the "/" page
    Then the page title should contain "Romanager"
    And the ROM library should be displayed
