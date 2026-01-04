package com.dino.transactionservice;

import com.github.f4b6a3.ulid.UlidCreator;
import io.confluent.kafka.serializers.KafkaAvroSerializer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericData;
import org.apache.avro.generic.GenericRecord;
import java.util.Properties;

public class TransactionProducer {

    private final KafkaProducer<String, Object> producer;
    private final Schema schema;
    public TransactionProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "0.0.0.0:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
        props.put("schema.registry.url", "http://0.0.0.0:8081");

        producer = new KafkaProducer<>(props);

        schema = new Schema.Parser().parse(
                "{\"type\":\"record\",\"name\":\"Transaction\"," +
                        "\"fields\":[{\"name\":\"date\",\"type\":\"string\"}," +
                        "{\"name\":\"amount\",\"type\":\"double\"},{\"name\":\"description\",\"type\":\"string\"}]}"
        );

    }

    public void produce(Transaction transaction) {
        String transactionId = UlidCreator.getUlid().toString();
        GenericRecord avroRecord = new GenericData.Record(schema);
        avroRecord.put("date", transaction.date());
        avroRecord.put("amount", transaction.amount());
        avroRecord.put("description", transaction.description());

        producer.send(new ProducerRecord<>("transaction-topic", transactionId, avroRecord),
                (metadata, ex) -> {
                    if (ex == null) {
                        System.out.println("Sent txn to " + metadata.topic() + "-" + metadata.partition());
                    } else {
                        ex.printStackTrace();
                    }
                });
    }
    public void close() {
        producer.flush();
        producer.close();
    }

}
