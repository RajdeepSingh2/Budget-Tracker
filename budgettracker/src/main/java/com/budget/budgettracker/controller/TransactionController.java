package com.budget.budgettracker.controller;

import com.budget.budgettracker.model.Transaction;
import com.budget.budgettracker.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    // ✅ Get all transactions
    @GetMapping
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
    }

    // ✅ Add a transaction
    @PostMapping
    public Transaction addTransaction(@RequestBody Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    // ✅ UPDATE a transaction (🔥 THIS WAS MISSING)
    @PutMapping("/{id}")
    public Transaction updateTransaction(
            @PathVariable Long id,
            @RequestBody Transaction updatedTransaction) {

        Transaction existing = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        existing.setType(updatedTransaction.getType());
        existing.setCategory(updatedTransaction.getCategory());
        existing.setAmount(updatedTransaction.getAmount());
        existing.setDate(updatedTransaction.getDate());
        existing.setDescription(updatedTransaction.getDescription());

        return transactionRepository.save(existing); // 🔴 THIS SAVES THE UPDATE
    }

    // ✅ Delete a transaction
    @DeleteMapping("/{id}")
    public void deleteTransaction(@PathVariable Long id) {
        transactionRepository.deleteById(id);
    }
}
