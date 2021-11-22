package com.notebook;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@EnableTransactionManagement
@MapperScan("com.notebook.mapper")
@SpringBootApplication
public class NoteBookApplication {

    public static void main(String[] args) {
        SpringApplication.run(NoteBookApplication.class, args);
    }

}
