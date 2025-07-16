# LLAMA 파인튜닝 가이드

## 개요

Exhell에서 수집된 데이터를 LLAMA 모델 파인튜닝에 사용하는 방법을 설명합니다.

## 지원 형식

### 1. Alpaca 형식
가장 널리 사용되는 LLAMA 파인튜닝 형식입니다.

```json
{
  "instruction": "월별 매출 관리 표를 만들어줘",
  "input": "",
  "output": "월별 매출 관리를 위한 Excel 표를 만들어드리겠습니다..."
}
```

### 2. LLAMA2-Chat 형식
Meta의 공식 LLAMA2 대화 형식입니다.

```
<s>[INST] <<SYS>>
당신은 Excel 전문가 AI 어시스턴트입니다.
<</SYS>>

월별 매출 관리 표를 만들어줘 [/INST] 월별 매출 관리를 위한... </s>
```

### 3. Vicuna/ShareGPT 형식
Vicuna 모델 학습에 사용되는 형식입니다.

```json
{
  "conversations": [
    {"from": "human", "value": "월별 매출 관리 표를 만들어줘"},
    {"from": "gpt", "value": "월별 매출 관리를 위한..."}
  ]
}
```

## 데이터 내보내기

### API 엔드포인트
```
POST /api/admin/fine-tuning/export
```

### 요청 예시

#### Alpaca 형식
```bash
curl -X POST http://localhost:3000/api/admin/fine-tuning/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "alpaca",
    "minQualityScore": 0.8,
    "minRating": 4,
    "taskTypes": ["CREATE", "CORRECT"],
    "limit": 5000
  }' \
  -o fine-tuning-alpaca.jsonl
```

#### LLAMA2 형식
```bash
curl -X POST http://localhost:3000/api/admin/fine-tuning/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "llama2",
    "minQualityScore": 0.8,
    "includeEdited": true
  }' \
  -o fine-tuning-llama2.txt
```

## 파인튜닝 도구

### 1. Axolotl 사용법

#### 설치
```bash
git clone https://github.com/OpenAccess-AI-Collective/axolotl
cd axolotl
pip install -e .
```

#### 설정 파일 (excel_expert.yml)
```yaml
base_model: meta-llama/Llama-2-7b-hf
model_type: LlamaForCausalLM

datasets:
  - path: ./fine-tuning-alpaca.jsonl
    type: alpaca
    
adapter: lora
lora_r: 16
lora_alpha: 32
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - v_proj
  - k_proj
  - o_proj

num_epochs: 3
learning_rate: 0.0002
batch_size: 4
gradient_accumulation_steps: 2

warmup_steps: 100
save_steps: 500
logging_steps: 100
```

#### 학습 실행
```bash
accelerate launch scripts/finetune.py excel_expert.yml
```

### 2. LLaMA-Factory 사용법

#### 설치
```bash
git clone https://github.com/hiyouga/LLaMA-Factory
cd LLaMA-Factory
pip install -r requirements.txt
```

#### 학습 실행
```bash
python src/train_bash.py \
    --model_name_or_path meta-llama/Llama-2-7b-hf \
    --dataset excel_expert \
    --dataset_format alpaca \
    --finetuning_type lora \
    --output_dir ./excel_expert_model \
    --num_train_epochs 3 \
    --per_device_train_batch_size 4
```

## 한국어 최적화

### 1. 한국어 토크나이저 확장
```python
from transformers import LlamaTokenizer

tokenizer = LlamaTokenizer.from_pretrained("meta-llama/Llama-2-7b-hf")

# 한국어 특수 토큰 추가
korean_tokens = ["엑셀", "시트", "수식", "함수", "피벗", "차트"]
tokenizer.add_tokens(korean_tokens)
```

### 2. 한국어 데이터 비율 확인
```javascript
// 통계 API 호출
fetch('/api/admin/fine-tuning/export?minQualityScore=0.8')
  .then(res => res.json())
  .then(data => {
    console.log('총 데이터:', data.stats.totalRecords)
    console.log('작업 유형별:', data.stats.taskTypeDistribution)
  })
```

## 모델 배포

### 1. 로컬 테스트
```python
from transformers import LlamaForCausalLM, LlamaTokenizer
import torch

model = LlamaForCausalLM.from_pretrained("./excel_expert_model")
tokenizer = LlamaTokenizer.from_pretrained("./excel_expert_model")

def generate_excel_help(prompt):
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(**inputs, max_length=500)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# 테스트
response = generate_excel_help("월별 매출 차트를 만드는 방법을 알려줘")
print(response)
```

### 2. 프로덕션 배포 옵션

#### vLLM 사용 (고성능)
```bash
pip install vllm

python -m vllm.entrypoints.api_server \
    --model ./excel_expert_model \
    --port 8000
```

#### TGI (Text Generation Inference) 사용
```bash
docker run --gpus all -p 8080:80 \
    -v ./excel_expert_model:/data \
    ghcr.io/huggingface/text-generation-inference:latest \
    --model-id /data
```

## 성능 비교

### 벤치마크 스크립트
```python
import time
import requests

def benchmark_model(endpoint, prompts):
    results = []
    for prompt in prompts:
        start = time.time()
        response = requests.post(endpoint, json={"prompt": prompt})
        latency = time.time() - start
        results.append({
            "prompt": prompt,
            "latency": latency,
            "tokens": len(response.json()["text"].split())
        })
    return results

# GPT-4 vs LLAMA 비교
gpt4_results = benchmark_model("http://api.openai.com/v1/completions", test_prompts)
llama_results = benchmark_model("http://localhost:8000/generate", test_prompts)
```

## 모니터링

### 1. 품질 메트릭
- BLEU Score: 번역 품질
- Perplexity: 모델 성능
- Task-specific accuracy: Excel 작업 정확도

### 2. 비용 분석
```
GPT-4: $0.03 / 1K tokens
LLAMA (자체 호스팅): 
  - GPU 비용: ~$500/월 (A100 40GB)
  - 무제한 요청 처리
  - ROI: 월 17,000 토큰 이상 시 이익
```

## 주의사항

1. **라이선스**: LLAMA2는 상업적 사용 가능 (월 활성 사용자 7억명 미만)
2. **GPU 요구사항**:
   - 7B 모델: 최소 24GB VRAM
   - 13B 모델: 최소 40GB VRAM
   - 70B 모델: 최소 80GB VRAM (또는 다중 GPU)
3. **데이터 품질**: 최소 1,000개 이상의 고품질 데이터 필요

## 추가 자료

- [Axolotl Documentation](https://github.com/OpenAccess-AI-Collective/axolotl)
- [LLaMA-Factory Guide](https://github.com/hiyouga/LLaMA-Factory)
- [vLLM Performance Guide](https://vllm.readthedocs.io/)
- [Korean LLaMA Community](https://github.com/KoLLaMA)