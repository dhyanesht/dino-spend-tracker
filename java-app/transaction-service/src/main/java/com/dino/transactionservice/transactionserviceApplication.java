package com.dino.transactionservice;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;

@SpringBootApplication
public class transactionserviceApplication {
    public static void main(String[] args) {
        SpringApplication.run(transactionserviceApplication.class, args);
        File csvFile = new File("/Users/dhyaneshthatchinamoorthy/Downloads/amex_2025_detail_activity.csv");
        new TransactionProcessor().injestCSV(csvFile);
    }
}


class TransactionProcessor {

    // Assuming the CSV format is like:
    // Date, Description, Amount
    // 2025-12-25, "Grocery Shopping", 50
    // 2025-12-24, "Coffee", 5.5
    // ...
    TransactionProducer transactionProducer = new TransactionProducer();

    void injestCSV(File path) {
        int transactionCount = 0;
        double totalAmount = 0.0;

        try (Reader reader = new FileReader(path)) {
            // CSVFormat.DEFAULT is configured to handle line breaks inside quoted fields by default
            Iterable<CSVRecord> records = CSVFormat.DEFAULT
                    .withFirstRecordAsHeader() // Skip the header row
                    .withQuote('"')  // Use the quote character for fields with line breaks
                    .parse(reader);

            // Process each CSV record

            for (CSVRecord record : records) {
                // Extract the fields using the header names
                String date = record.get("Date");
                String description = record.get("Description");
                String amount = record.get("Amount");
                String extendedDetails = record.get("Extended Details");

                try {
                    double amountDouble = Double.parseDouble(amount.trim());
                    totalAmount += amountDouble;
                    transactionCount++;
                    transactionProducer.produce(new Transaction(date, amountDouble, description));
                } catch (NumberFormatException e) {
                    System.err.println("Invalid amount in transaction: " + record);
                }

            }
        } catch (IOException e) {
            System.err.println("Error reading the CSV file: " + e.getMessage());
        }
        // Print the summary
        System.out.println("Here are the transaction Summary:");
        System.out.println("There are " + transactionCount + " Transactions in the file.");
        System.out.printf("Total amount is %.2f%n", totalAmount);
        transactionProducer.close();
    }

}

record Transaction(String date, Double amount, String description) {}