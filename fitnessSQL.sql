CREATE SCHEMA IF NOT EXISTS `C237CA2_topsortjar` DEFAULT CHARACTER SET utf8;
USE `C237CA2_topsortjar`;

-- -----------------------------------------------------
-- Table `members`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `members` (
  `memberID` INT NOT NULL AUTO_INCREMENT,
  `memberName` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) NULL,
  `phone` VARCHAR(20) NULL,
  `role` ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  PRIMARY KEY (`memberID`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC))
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `location`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `location` (
  `locationID` INT NOT NULL AUTO_INCREMENT,
  `location_name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(20) NULL,
  `postal_code` VARCHAR(20) NOT NULL,
  `country` VARCHAR(50) NOT NULL,
  `image` VARCHAR(255) NULL,
  PRIMARY KEY (`locationID`))
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `room`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `room` (
  `roomID` INT NOT NULL AUTO_INCREMENT,
  `roomName` VARCHAR(50) NOT NULL,
  `capacity` INT NOT NULL,
  `locationID` INT NOT NULL,
  PRIMARY KEY (`roomID`),
  INDEX `fk_room_location_idx` (`locationID` ASC),
  CONSTRAINT `fk_room_location`
    FOREIGN KEY (`locationID`)
    REFERENCES `location` (`locationID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `class`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `class` (
  `classID` INT NOT NULL AUTO_INCREMENT,
  `className` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `startTime` DATETIME NOT NULL,
  `endTime` DATETIME NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `roomID` INT NOT NULL,
  PRIMARY KEY (`classID`),
  INDEX `fk_class_room1_idx` (`roomID` ASC),
  CONSTRAINT `fk_class_room1`
    FOREIGN KEY (`roomID`)
    REFERENCES `room` (`roomID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `booking`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `booking` (
  `bookingID` INT NOT NULL AUTO_INCREMENT,
  `memberID` INT NOT NULL,
  `classID` INT NOT NULL,
  `booking_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'confirmed',
  PRIMARY KEY (`bookingID`),
  INDEX `fk_booking_members1_idx` (`memberID` ASC),
  INDEX `fk_booking_class1_idx` (`classID` ASC),
  CONSTRAINT `fk_booking_members1`
    FOREIGN KEY (`memberID`)
    REFERENCES `members` (`memberID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_class1`
    FOREIGN KEY (`classID`)
    REFERENCES `class` (`classID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `billing`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `billing` (
  `billingID` INT NOT NULL AUTO_INCREMENT,
  `memberID` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_method` ENUM('credit_card', 'debit_card') NOT NULL,
  `status` ENUM('completed', 'failed') NOT NULL DEFAULT 'completed',
  `classID` INT NULL,
  PRIMARY KEY (`billingID`),
  INDEX `fk_billing_members1_idx` (`memberID` ASC),
  INDEX `fk_billing_class1_idx` (`classID` ASC),
  CONSTRAINT `fk_billing_members1`
    FOREIGN KEY (`memberID`)
    REFERENCES `members` (`memberID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_billing_class1`
    FOREIGN KEY (`classID`)
    REFERENCES `class` (`classID`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Insert sample data
-- -----------------------------------------------------

-- Sample 1: Basic setup with one location, room, member, class, booking, and billing
INSERT INTO `members` (`memberName`, `email`, `password`, `address`, `phone`, `role`) 
VALUES ('John Doe', 'john@example.com', 'hashed_password1', '123 Main St', '555-1234', 'member'),
       ('Sarah Williams', 'sarah@example.com', 'hashed_password4', '321 Elm St', '555-3456', 'admin');

INSERT INTO `location` (`location_name`, `address`, `unit`, `postal_code`, `country`, `image`) 
VALUES ('Downtown Fitness', '789 Fitness Blvd', 'Suite 100', '10001', 'USA', 'downtown.jpg');

INSERT INTO `room` (`roomName`, `capacity`, `locationID`) 
VALUES ('Yoga Studio', 20, 1),
       ('Spin Room', 15, 1);

INSERT INTO `class` (`className`, `description`, `startTime`, `endTime`, `price`, `roomID`) 
VALUES ('Morning Yoga', 'Beginner friendly yoga class', '2023-11-01 08:00:00', '2023-11-01 09:00:00', 15.00, 1),
       ('Advanced Spin', 'High intensity spin class', '2023-11-01 17:00:00', '2023-11-01 18:00:00', 20.00, 2);

INSERT INTO `booking` (`memberID`, `classID`, `status`) 
VALUES (1, 1, 'confirmed'),
       (1, 2, 'confirmed');

INSERT INTO `billing` (`memberID`, `price`, `description`, `payment_method`, `status`, `classID`) 
VALUES (1, 15.00, 'Morning Yoga class fee', 'credit_card', 'completed', 1),
       (1, 20.00, 'Advanced Spin class fee', 'debit_card', 'completed', 2);

-- Sample 2: Additional data with different scenarios
INSERT INTO `members` (`memberName`, `email`, `password`, `address`, `phone`, `role`) 
VALUES ('Mike Johnson', 'mike@example.com', 'hashed_password3', '789 Pine Rd', '555-9012', 'member');

INSERT INTO `class` (`className`, `description`, `startTime`, `endTime`, `price`, `roomID`) 
VALUES ('Evening Yoga', 'Relaxing evening session', '2023-11-02 19:00:00', '2023-11-02 20:00:00', 12.00, 1);

INSERT INTO `booking` (`memberID`, `classID`, `status`) 
VALUES (3, 3, 'confirmed'),
       (1, 3, 'cancelled');

INSERT INTO `billing` (`memberID`, `price`, `description`, `payment_method`, `status`, `classID`) 
VALUES (3, 12.00, 'Evening Yoga class fee', 'credit_card', 'completed', 3),
       (1, 12.00, 'Evening Yoga class fee (cancelled)', 'credit_card', 'failed', 3);
       (1, 12.00, 'Evening Yoga class fee (cancelled)', 'credit_card', 'failed', 3);
