from fastapi import APIRouter, Depends
from dependency_injector.wiring import inject, Provide
from app.container import Container
from app.message.producer import KafkaProducer

router = APIRouter()

@router.get("/health")
@inject
def health(
    kafka: KafkaProducer = Depends(Provide[Container.kafka_producer]),
):
    return {
        "status": "healthy",
        "kafka_producer": kafka is not None,
    }

@router.get("/", tags=["server info"])
def read_root():
    return {"Hello": "World"}
