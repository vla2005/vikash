package com.vikash_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class VikashApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(VikashApiApplication.class, args);
	}

}
